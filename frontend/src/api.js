// 轻量请求封装
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = '请求失败';
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
    const s = qs.toString();
    return request(`/api/records${s ? '?' + s : ''}`);
  },
  get: (id) => request(`/api/records/${id}`),
  create: (data) => request('/api/records', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/records/${id}`, { method: 'DELETE' }),
  stats: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
    const s = qs.toString();
    return request(`/api/stats${s ? '?' + s : ''}`);
  },
  heatmap: (year) => request(`/api/heatmap?year=${year}`),
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      let msg = '上传失败';
      try { const d = await res.json(); if (d.error) msg = d.error; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },
};