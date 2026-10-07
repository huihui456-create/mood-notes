// 轻量请求封装：登录用户走服务端接口，游客模式走浏览器本地存储
import { guestStore, guestStats, guestHeatmap, compressImageForGuest } from './guestStore.js';
import { triggerUnauthorized } from './auth.jsx';

let authGetter = () => ({ token: '', mode: null });

// 由 AuthProvider 在初始化后注入，避免循环依赖
export function setAuthGetter(getter) {
  authGetter = getter;
}

async function request(url, options = {}) {
  const { token } = authGetter();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    // 登录态失效：清除并回登录页（游客模式不会走到这里）
    if (res.status === 401) triggerUnauthorized();
    let msg = '请求失败';
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

// 当前是否游客模式
function isGuest() {
  return authGetter().mode === 'guest';
}

// 补记标记（记录日期早于今天）
function withBackfill(r) {
  const today = new Date().toISOString().slice(0, 10);
  return { ...r, backfill: (r.recorded_date || '') < today };
}

export const api = {
  // ---------- 认证 ----------
  async register(username, password) {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
  },
  async login(username, password) {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  },

  // ---------- 记录 ----------
  list(params = {}) {
    if (isGuest()) {
      return Promise.resolve(guestStore.list(params).map(withBackfill));
    }
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
    const s = qs.toString();
    return request(`/api/records${s ? '?' + s : ''}`);
  },

  get(id) {
    if (isGuest()) {
      const r = guestStore.get(id);
      return r ? Promise.resolve(withBackfill(r)) : Promise.reject(new Error('记录不存在'));
    }
    return request(`/api/records/${id}`);
  },

  create(data) {
    if (isGuest()) return Promise.resolve(withBackfill(guestStore.create(data)));
    return request('/api/records', { method: 'POST', body: JSON.stringify(data) });
  },

  update(id, data) {
    if (isGuest()) return Promise.resolve(withBackfill(guestStore.update(id, data)));
    return request(`/api/records/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  remove(id) {
    if (isGuest()) return Promise.resolve(guestStore.remove(id));
    return request(`/api/records/${id}`, { method: 'DELETE' });
  },

  stats(params = {}) {
    if (isGuest()) return Promise.resolve(guestStats(params));
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
    const s = qs.toString();
    return request(`/api/stats${s ? '?' + s : ''}`);
  },

  heatmap(year) {
    if (isGuest()) return Promise.resolve(guestHeatmap(year));
    return request(`/api/heatmap?year=${year}`);
  },

  uploadImage(file) {
    if (isGuest()) {
      // 游客图片压缩后存本地 data URL（由 guestStore 提供）
      return compressImageForGuest(file).then(url => ({ url }));
    }
    const form = new FormData();
    form.append('image', file);
    const { token } = authGetter();
    return fetch('/api/upload', { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) triggerUnauthorized();
          let msg = '上传失败';
          try { const d = await res.json(); if (d.error) msg = d.error; } catch {}
          throw new Error(msg);
        }
        return res.json();
      });
  },

  // ---------- 游客迁移（游客状态下把本地数据导入新账号） ----------
  async migrateGuestToUser(username, password) {
    if (!isGuest()) throw new Error('当前不是游客模式');
    const local = guestStore.allForMigrate();
    // 先注册新账号，拿到 token 后显式带上该 token 逐条导入
    const reg = await this.register(username, password);
    const me = this;
    for (const rec of local) {
      // 游客图片是 data URL，无法迁移到服务器，迁移时已置空 image
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.token}` },
        body: JSON.stringify(rec),
      }).then(async (res) => {
        if (!res.ok) {
          let msg = '迁移失败';
          try { const d = await res.json(); if (d.error) msg = d.error; } catch {}
          throw new Error(msg);
        }
        return res.json();
      });
    }
    // 导入成功后清空本地游客数据
    guestStore.clear();
    return reg;
  },
};