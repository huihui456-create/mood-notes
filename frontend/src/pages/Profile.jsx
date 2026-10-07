import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function Profile() {
  const [stats, setStats] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  const doExport = async (type) => {
    try {
      const res = await fetch(`/api/export/${type}`, { method: 'GET' });
      if (!res.ok) { toast('导出失败'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      a.download = `心情笔记-${stamp}.${type === 'json' ? 'json' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('数据已导出 📦');
    } catch (e) {
      toast('导出失败：' + e.message);
    }
  };

  return (
    <div className="page">
      <div className="page-title">🌸 我的</div>
      <div className="page-sub">账号与数据管理</div>

      {/* 数据概览 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>我的数据</div>
        {stats ? (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="num coral">{stats.total}</div>
              <div className="label">总记录</div>
            </div>
            <div className="stat-card">
              <div className="num blue">{stats.days}</div>
              <div className="label">记录天数</div>
            </div>
            <div className="stat-card">
              <div className="num coral">{stats.streak}</div>
              <div className="label">连续天数</div>
            </div>
            <div className="stat-card">
              <div className="num blue">{Object.keys(stats.moodDist || {}).length}</div>
              <div className="label">体验过的心情</div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--ink-soft)', fontSize: 14 }}>加载中…</div>
        )}
      </div>

      {/* 数据导出 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>导出我的数据</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.6 }}>
          数据永远属于你，随时可以带走全部记录（心情、强度、描述、日期、图片地址）。
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => doExport('json')}>导出 JSON</button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => doExport('csv')}>导出 CSV</button>
        </div>
      </div>

      {/* 关于 */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>🌤 心情笔记</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.8 }}>
          记录不只是留下文字，更是温柔地记住自己。
          <br />
          · 数据仅存储在你的服务器上，只对你可见
          <br />
          · 不做任何心理诊断，只客观呈现数据
        </div>
      </div>
    </div>
  );
}