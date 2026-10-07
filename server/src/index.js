import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { db, UPLOAD_DIR, DATA_DIR } from './db.js';
import { MOOD_MAP, VALID_MOOD_KEYS, trendScore } from './moods.js';
import {
  createUser, getUserByUsername, usernameExists, verifyPassword,
  createSession, getUserByToken, deleteSession
} from './auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ---------- 静态资源 ----------
const FE_DIST = process.env.FE_DIST || path.join(import.meta.dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(FE_DIST));
// 图片静态访问
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// ---------- 图片上传（multer + sharp 压缩） ----------
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('仅支持图片文件'));
    cb(null, true);
  }
});

async function saveImage(buffer) {
  const ext = '.jpg';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const outPath = path.join(UPLOAD_DIR, name);
  let image = sharp(buffer);
  const meta = await image.metadata();
  // 压缩：最长边 1600px、质量 82，保留 EXIF 方向
  if (meta.width > 1600 || meta.height > 1600) {
    image = image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true });
  }
  await image.rotate().jpeg({ quality: 82 }).toFile(outPath);
  return name;
}

// ---------- 认证 ----------
// 通用鉴权中间件：解析 Bearer token，挂在 req.user；未登录返回 401
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: '请先登录' });
  req.user = user;
  req.token = token;
  next();
}

// 注册 / 登录 / 登出 / 当前用户
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  const name = String(username || '').trim();
  if (!name) return res.status(400).json({ error: '请输入用户名' });
  if (name.length < 2 || name.length > 20) return res.status(400).json({ error: '用户名长度需为 2-20 个字符' });
  if (!/^[\w\u4e00-\u9fa5-]+$/.test(name)) return res.status(400).json({ error: '用户名只能包含中文、字母、数字、下划线或短横线' });
  if (!password || String(password).length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  if (usernameExists(name)) return res.status(409).json({ error: '用户名已被注册，换一个试试' });
  const user = createUser(name, String(password));
  const token = createSession(user.id);
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const name = String(username || '').trim();
  const user = getUserByUsername(name);
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码不正确' });
  }
  const token = createSession(user.id);
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  deleteSession(req.token);
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ---------- 图片上传（登录用户，图片归属对应记录） ----------
app.post('/api/upload', requireAuth, multerUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未收到图片' });
    const name = await saveImage(req.file.buffer);
    res.json({ url: `/uploads/${name}` });
  } catch (e) {
    res.status(400).json({ error: '图片处理失败：' + e.message });
  }
});

// ---------- 记录 CRUD（全部按登录用户隔离） ----------

// 获取列表：支持 mood 筛选 / 年份月份筛选 / 关键词搜索；返回带趋势分与补记标记
app.get('/api/records', requireAuth, (req, res) => {
  const { mood, year, month, q } = req.query;
  const conds = ['user_id = ?'];
  const params = [req.user.id];
  if (mood && VALID_MOOD_KEYS.includes(mood)) { conds.push('mood = ?'); params.push(mood); }
  if (year) { conds.push("strftime('%Y', recorded_date) = ?"); params.push(String(year)); }
  if (month && year) { conds.push("strftime('%m', recorded_date) = ?"); params.push(String(month).padStart(2, '0')); }
  if (q) { conds.push('content LIKE ?'); params.push(`%${q}%`); }
  const where = 'WHERE ' + conds.join(' AND ');
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`SELECT * FROM records ${where} ORDER BY recorded_date DESC, id DESC`).all(...params);
  res.json(rows.map(r => ({ ...r, backfill: r.recorded_date < today, trend: trendScore(r.mood, r.intensity) })));
});

// 单条
app.get('/api/records/:id', requireAuth, (req, res) => {
  const r = db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!r) return res.status(404).json({ error: '记录不存在' });
  res.json({ ...r, trend: trendScore(r.mood, r.intensity) });
});

// 新增
app.post('/api/records', requireAuth, (req, res) => {
  const { mood, intensity = null, content = '', image = null, recorded_date = null } = req.body || {};
  if (!VALID_MOOD_KEYS.includes(mood)) return res.status(400).json({ error: '无效的心情分类' });
  let iv = intensity == null ? null : Math.max(1, Math.min(5, Number(intensity) || 3));
  let date = recorded_date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  // 补记标记：recorded_date 早于今天
  const isBackfill = date < new Date().toISOString().slice(0, 10);
  const info = db.prepare(
    'INSERT INTO records (mood, intensity, content, image, recorded_date, created_at, updated_at, user_id) VALUES (?,?,?,?,?,?,?,?)'
  ).run(mood, iv, (content || '').trim(), image || null, date, now, now, req.user.id);
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...row, backfill: isBackfill, trend: trendScore(row.mood, row.intensity) });
});

// 编辑
app.put('/api/records/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: '记录不存在' });
  const { mood = existing.mood, intensity = existing.intensity, content = existing.content, image = existing.image, recorded_date = existing.recorded_date } = req.body || {};
  if (!VALID_MOOD_KEYS.includes(mood)) return res.status(400).json({ error: '无效的心情分类' });
  let iv = intensity == null ? null : Math.max(1, Math.min(5, Number(intensity) || 3));
  let date = recorded_date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = existing.recorded_date;
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE records SET mood=?, intensity=?, content=?, image=?, recorded_date=?, updated_at=? WHERE id=? AND user_id=?'
  ).run(mood, iv, (content || '').trim(), image || null, date, now, id, req.user.id);
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  res.json({ ...row, backfill: row.recorded_date < new Date().toISOString().slice(0, 10), trend: trendScore(row.mood, row.intensity) });
});

// 删除（同时清理图片文件）
app.delete('/api/records/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM records WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ error: '记录不存在' });
  db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (existing.image) {
    const file = path.join(UPLOAD_DIR, path.basename(existing.image));
    fs.existsSync(file) && fs.unlinkSync(file);
  }
  res.json({ ok: true });
});

// ---------- 统计聚合（按用户隔离） ----------
app.get('/api/stats', requireAuth, (req, res) => {
  const { year, month, from, to } = req.query;
  const conds = ['user_id = ?'];
  const params = [req.user.id];
  if (from) { conds.push('recorded_date >= ?'); params.push(String(from)); }
  if (to) { conds.push('recorded_date <= ?'); params.push(String(to)); }
  if (year) { conds.push("strftime('%Y', recorded_date) = ?"); params.push(String(year)); }
  if (month && year) { conds.push("strftime('%m', recorded_date) = ?"); params.push(String(month).padStart(2, '0')); }
  const where = 'WHERE ' + conds.join(' AND ');

  const total = db.prepare(`SELECT COUNT(*) c FROM records ${where}`).get(...params).c;
  const days = db.prepare(`SELECT COUNT(DISTINCT recorded_date) c FROM records ${where}`).get(...params).c;

  // 连续记录天数（截至今天的连续打卡，基于全部记录）
  const streak = calcStreak(req.user.id);

  // 心情分布
  const dist = db.prepare(`SELECT mood, COUNT(*) c FROM records ${where} GROUP BY mood`).all(...params);
  const moodDist = Object.fromEntries(dist.map(d => [d.mood, d.c]));
  // 强度分布（嵌套）
  const intensityDist = db.prepare(`SELECT mood, intensity, COUNT(*) c FROM records ${where} GROUP BY mood, intensity`).all(...params);

  // 按天统计趋势均值与次数
  const byDay = db.prepare(`
    SELECT recorded_date day, COUNT(*) c, AVG(
      CASE mood
        WHEN 'happy' THEN 1 WHEN 'calm' THEN 1 WHEN 'surprised' THEN 1
        WHEN 'anxious' THEN -1 WHEN 'sad' THEN -1 WHEN 'angry' THEN -1
        ELSE 0 END
    ) * AVG(intensity) avg_trend
    FROM records ${where} GROUP BY recorded_date ORDER BY recorded_date
  `).all(...params).map(r => ({
    day: r.day,
    count: r.c,
    avgTrend: Math.round((r.avg_trend || 0) * 100) / 100
  }));

  res.json({ total, days, streak, moodDist, intensityDist, byDay });
});

function calcStreak(userId) {
  const rows = db.prepare('SELECT DISTINCT recorded_date d FROM records WHERE user_id = ? ORDER BY d DESC').all(userId);
  if (!rows.length) return 0;
  const days = rows.map(r => r.d);
  // 今天有记录则从今天数，否则从昨天数（今天还没记不算断）
  const today = new Date().toISOString().slice(0, 10);
  const daySet = new Set(days);
  let streak = 0;
  let cursor = daySet.has(today) ? today : addDays(today, -1);
  const cursorSet = new Set();
  while (daySet.has(cursor) && !cursorSet.has(cursor)) {
    cursorSet.add(cursor);
    streak++;
    cursor = addDays(cursor, -1);
  }
  if (!streak && !daySet.has(today)) return 0;
  return streak;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// 年度热力图数据：整年每天记录强度
app.get('/api/heatmap', requireAuth, (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const rows = db.prepare(`
    SELECT recorded_date day, COUNT(*) c, AVG(intensity) avg_intensity
    FROM records WHERE user_id = ? AND strftime('%Y', recorded_date) = ?
    GROUP BY recorded_date
  `).all(req.user.id, String(year));
  res.json({ year, days: rows.map(r => ({ day: r.day, count: r.c, avgIntensity: Math.round((r.avg_intensity || 0) * 10) / 10 })) });
});

// ---------- 导出（按登录用户隔离） ----------
function allRecords(userId) {
  return db.prepare('SELECT * FROM records WHERE user_id = ? ORDER BY recorded_date DESC, id DESC').all(userId);
}

app.get('/api/export/json', requireAuth, (req, res) => {
  const data = allRecords(req.user.id).map(r => ({
    id: r.id, mood: r.mood, intensity: r.intensity, content: r.content,
    image: r.image ? `/uploads/${path.basename(r.image)}` : null,
    recorded_date: r.recorded_date, created_at: r.created_at, updated_at: r.updated_at
  }));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mood-notes-export.json"');
  res.send(JSON.stringify({ app: '心情笔记', exported_at: new Date().toISOString(), records: data }, null, 2));
});

app.get('/api/export/csv', requireAuth, (req, res) => {
  const rows = allRecords(req.user.id);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['id,mood,intensity,content,image,recorded_date,created_at,updated_at'];
  for (const r of rows) {
    lines.push([r.id, r.mood, r.intensity ?? '', esc(r.content), r.image ? `/uploads/${path.basename(r.image)}` : '', r.recorded_date, r.created_at, r.updated_at].join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mood-notes-export.csv"');
  res.send('\uFEFF' + lines.join('\n')); // BOM 保证 Excel 正确显示中文
});

// ---------- SPA 回退 ----------
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  const indexPath = path.join(FE_DIST, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  next();
});

// 前端未构建时给出提示
app.get('/', (req, res) => {
  const indexPath = path.join(FE_DIST, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.send('前端尚未构建。请在 frontend 目录执行 npm run build 后重启服务。');
  }
  res.sendFile(indexPath);
});

app.use((err, req, res, next) => {
  if (err) {
    return res.status(err.status || 500).json({ error: err.message || '服务器错误' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`心情笔记服务已启动: http://localhost:${PORT}`);
});