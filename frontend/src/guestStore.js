// 游客模式本地存储模块
// 游客数据仅保存在浏览器 localStorage，不发送到服务器；清空浏览器缓存即丢失
import { MOODS, INTENSITY_LABELS } from './moods.js';

const LS_KEY = 'mood_notes_guest_records';
const MAX_IMAGE_BYTES = 400 * 1024; // 单张本地图片压缩后上限约 400KB（localStorage 容量有限）

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function nextId(list) {
  return list.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
}

// 与后端字段保持一致：id/mood/intensity/content/image/recorded_date/created_at/updated_at
export const guestStore = {
  list({ mood, year, month, q } = {}) {
    let list = readAll();
    if (mood && MOODS.some(m => m.key === mood)) list = list.filter(r => r.mood === mood);
    if (year) list = list.filter(r => String(r.recorded_date || '').slice(0, 4) === String(year));
    if (month && year) list = list.filter(r => String(r.recorded_date || '').slice(5, 7) === String(month).padStart(2, '0'));
    if (q) list = list.filter(r => (r.content || '').includes(q));
    return list.sort((a, b) => (b.recorded_date || '').localeCompare(a.recorded_date || '') || (b.id - a.id));
  },

  get(id) {
    return readAll().find(r => r.id === Number(id)) || null;
  },

  create(data) {
    const list = readAll();
    const now = new Date().toISOString();
    const rec = {
      id: nextId(list),
      mood: data.mood,
      intensity: data.intensity ?? null,
      content: (data.content || '').trim(),
      image: data.image || null,
      recorded_date: data.recorded_date || now.slice(0, 10),
      created_at: now,
      updated_at: now,
    };
    list.push(rec);
    writeAll(list);
    return { ...rec, backfill: rec.recorded_date < now.slice(0, 10) };
  },

  update(id, data) {
    const list = readAll();
    const idx = list.findIndex(r => r.id === Number(id));
    if (idx === -1) return null;
    const old = list[idx];
    const updated = {
      ...old,
      mood: data.mood ?? old.mood,
      intensity: data.intensity !== undefined ? data.intensity : old.intensity,
      content: data.content !== undefined ? (data.content || '').trim() : old.content,
      image: data.image !== undefined ? data.image : old.image,
      recorded_date: data.recorded_date || old.recorded_date,
      updated_at: new Date().toISOString(),
    };
    list[idx] = updated;
    writeAll(list);
    return { ...updated, backfill: updated.recorded_date < new Date().toISOString().slice(0, 10) };
  },

  remove(id) {
    const list = readAll();
    const next = list.filter(r => r.id !== Number(id));
    writeAll(next);
    return { ok: true };
  },

  count() {
    return readAll().length;
  },

  // 供统计使用：返回全部记录
  all() {
    return readAll();
  },

  // 游客一键迁移：把本地数据转为服务端字段格式（去掉 id，由服务端分配）
  allForMigrate() {
    const list = readAll();
    return list
      .slice()
      .sort((a, b) => (a.recorded_date || '').localeCompare(b.recorded_date || '') || (a.id - b.id))
      .map(({ mood, intensity, content, image, recorded_date }) => ({
        mood,
        intensity,
        content: content || '',
        // 游客图片是 data URL，无法直接迁移到服务器，迁移时丢弃图片并提示
        image: null,
        recorded_date,
      }));
  },

  clear() {
    localStorage.removeItem(LS_KEY);
  },
};

// 统计聚合（与后端 /api/stats 语义一致）
export function guestStats(params = {}) {
  const list = readAll();
  const { year, month, from, to } = params;
  let rows = list;
  if (from) rows = rows.filter(r => r.recorded_date >= from);
  if (to) rows = rows.filter(r => r.recorded_date <= to);
  if (year) rows = rows.filter(r => String(r.recorded_date || '').slice(0, 4) === String(year));
  if (month && year) rows = rows.filter(r => String(r.recorded_date || '').slice(5, 7) === String(month).padStart(2, '0'));

  const total = rows.length;
  const days = new Set(rows.map(r => r.recorded_date)).size;

  const moodDist = {};
  rows.forEach(r => { moodDist[r.mood] = (moodDist[r.mood] || 0) + 1; });

  const intensityDist = [];
  const byDayMap = {};
  rows.forEach(r => {
    intensityDist.push({ mood: r.mood, intensity: r.intensity, c: 1 });
    if (!byDayMap[r.recorded_date]) byDayMap[r.recorded_date] = { c: 0, trendSum: 0, trendCount: 0 };
    byDayMap[r.recorded_date].c += 1;
    const polarity = MOODS.find(m => m.key === r.mood)?.polarity ?? 0;
    if (r.intensity != null) {
      byDayMap[r.recorded_date].trendSum += polarity * r.intensity;
      byDayMap[r.recorded_date].trendCount += 1;
    }
  });
  const byDay = Object.keys(byDayMap).sort().map(day => ({
    day,
    count: byDayMap[day].c,
    avgTrend: byDayMap[day].trendCount
      ? Math.round((byDayMap[day].trendSum / byDayMap[day].trendCount) * 100) / 100
      : byDayMap[day].trendSum,
  }));

  // 连续记录天数（与后端算法一致）
  const dates = rows.map(r => r.recorded_date).filter(Boolean);
  const daySet = new Set(dates);
  const today = new Date().toISOString().slice(0, 10);
  const addDays = (ds, n) => {
    const d = new Date(ds + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  let streak = 0;
  let cursor = daySet.has(today) ? today : (daySet.has(addDays(today, -1)) ? addDays(today, -1) : null);
  const seen = new Set();
  while (cursor && daySet.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    streak++;
    cursor = addDays(cursor, -1);
  }

  return { total, days, streak, moodDist, intensityDist, byDay };
}

// 年度热力图
export function guestHeatmap(year) {
  const y = Number(year) || new Date().getFullYear();
  const map = {};
  readAll()
    .filter(r => String(r.recorded_date || '').slice(0, 4) === String(y))
    .forEach(r => {
      if (!map[r.recorded_date]) map[r.recorded_date] = { c: 0, sum: 0 };
      map[r.recorded_date].c += 1;
      if (r.intensity != null) map[r.recorded_date].sum += r.intensity;
    });
  const days = Object.keys(map).sort().map(day => ({
    day,
    count: map[day].c,
    avgIntensity: map[day].sum ? Math.round((map[day].sum / map[day].c) * 10) / 10 : map[day].c,
  }));
  return { year: y, days };
}

// 游客图片压缩为 data URL（最长边 900px，JPEG 0.75），图片同样只存本机
export async function compressImageForGuest(file) {
  // 非图片或过小直接用原文件读成 data URL
  if (!file.type.startsWith('image/')) return null;
  const loadImage = (f) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(f);
  });

  const img = await loadImage(file);
  const maxSide = 900;
  let { width, height } = img;
  if (width > maxSide || height > maxSide) {
    const ratio = Math.min(1, maxSide / Math.max(width, height));
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  let quality = 0.75;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  // 超过容量上限则逐步降质
  while (dataUrl.length > MAX_IMAGE_BYTES && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}