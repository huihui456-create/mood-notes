import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { guestStore } from '../guestStore.js';

export default function Profile() {
  const [stats, setStats] = useState(null);
  const { mode, username, token, logout, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // 迁移弹窗状态
  const [showMigrate, setShowMigrate] = useState(false);
  const [mUsername, setMUsername] = useState('');
  const [mPassword, setMPassword] = useState('');
  const [mPassword2, setMPassword2] = useState('');
  const [migrating, setMigrating] = useState(false);

  const isGuest = mode === 'guest';

  const load = () => {
    api.stats().then(setStats).catch(() => {});
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [mode]);

  const doExport = async (type) => {
    try {
      // 登录用户：服务端导出；游客：本地数据导出
      if (isGuest) {
        // 游客导出：图片是 data URL，避免撑爆导出文件，导出时仅保留图片占位标记
        const list = guestStore.list().map(r => ({
          ...r,
          image: r.image ? '(本地图片，未随导出文件迁移)' : null,
        }));
        const payload = { app: '心情笔记（游客本地数据）', exported_at: new Date().toISOString(), records: list };
        const content = type === 'json'
          ? JSON.stringify(payload, null, 2)
          : ['id,mood,intensity,content,image,recorded_date,created_at,updated_at']
              .concat(list.map(r => [r.id, r.mood, r.intensity ?? '', `"${String(r.content || '').replace(/"/g, '""')}"`, r.image ? r.image : '', r.recorded_date, r.created_at, r.updated_at].join(',')))
              .join('\n');
        const blob = new Blob([type === 'json' ? content : '\uFEFF' + content], { type: type === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        a.href = url;
        a.download = `心情笔记-游客-${stamp}.${type === 'json' ? 'json' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('本地数据已导出 📦');
        return;
      }
      const res = await fetch(`/api/export/${type}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
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

  // 游客一键迁移：注册新账号并导入本地数据
  const handleMigrate = async (e) => {
    e.preventDefault();
    const name = mUsername.trim();
    if (!name) { toast('请输入用户名'); return; }
    if (mPassword.length < 6) { toast('密码至少 6 位'); return; }
    if (mPassword !== mPassword2) { toast('两次输入的密码不一致'); return; }
    setMigrating(true);
    try {
      await api.migrateGuestToUser(name, mPassword);
      // 迁移完成：本地已清空，重新登录态为刚注册的用户
      const res = await api.login(name, mPassword);
      login(res.token, res.user.username);
      toast('注册成功，本地数据已保存到服务器 🎉');
      setShowMigrate(false);
      setMUsername(''); setMPassword(''); setMPassword2('');
    } catch (err) {
      toast('迁移失败：' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="page">
      <div className="page-title">🌸 我的</div>
      <div className="page-sub">账号与数据管理</div>

      {/* 当前身份 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {isGuest ? '👀 当前为游客模式' : `🌸 ${username}`}
        </div>
        {isGuest ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 12 }}>
              游客模式数据<strong>仅保存在本机浏览器</strong>，不会上传到服务器。
              <br />
              <strong>清空浏览器缓存后数据将永久丢失</strong>。注册账号后，数据将安全保存在服务器上。
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowMigrate(true)}>
              注册账号，保存本地数据 →
            </button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
            数据保存在本应用的服务器上，仅你本人可见。
            <br />
            不同账号之间的数据完全隔离。
          </div>
        )}
      </div>

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
          {isGuest
            ? '导出的是本机缓存的数据（图片为本地链接，转移设备后可能无法加载）。'
            : '数据永远属于你，随时可以带走全部记录（心情、强度、描述、日期、图片地址）。'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => doExport('json')}>导出 JSON</button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => doExport('csv')}>导出 CSV</button>
        </div>
      </div>

      {/* 退出登录 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>账号操作</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
          {isGuest ? '退出游客模式（本机缓存的数据仍保留，可选择注册保存）。' : '退出登录后，本机不再保留账号数据访问凭证。'}
        </div>
        <button className="btn btn-danger-ghost" style={{ width: '100%' }} onClick={handleLogout}>
          退出当前模式
        </button>
      </div>

      {/* 关于 */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>🌤 心情笔记</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.8 }}>
          记录不只是留下文字，更是温柔地记住自己。
          <br />
          · 注册用户数据仅存于你的服务器，账号间完全隔离
          <br />
          · 游客数据仅存本机浏览器，清空缓存即丢失
          <br />
          · 不做任何心理诊断，只客观呈现数据
        </div>
      </div>

      {/* 游客迁移弹窗 */}
      {showMigrate && (
        <div className="overlay" onClick={() => { if (!migrating) setShowMigrate(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="dm-mood">🌸 注册账号，保存本地数据</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7, margin: '6px 0 14px' }}>
              注册后，本机的 <strong>{guestStore.list().length} 条记录</strong> 将保存到你的账号（服务器）。
              <br />
              游客模式的图片仅存于本机（data URL），迁移后图片无法上传到服务器，将不随记录迁移。
            </div>
            <form onSubmit={handleMigrate}>
              <input
                className="input"
                style={{ marginBottom: 10 }}
                placeholder="用户名（2-20 个字符）"
                value={mUsername}
                maxLength={20}
                onChange={e => setMUsername(e.target.value)}
                autoComplete="username"
              />
              <input
                className="input"
                style={{ marginBottom: 10 }}
                type="password"
                placeholder="密码（至少 6 位）"
                value={mPassword}
                onChange={e => setMPassword(e.target.value)}
                autoComplete="new-password"
              />
              <input
                className="input"
                style={{ marginBottom: 16 }}
                type="password"
                placeholder="再输入一次密码"
                value={mPassword2}
                onChange={e => setMPassword2(e.target.value)}
                autoComplete="new-password"
              />
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowMigrate(false)} disabled={migrating}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={migrating}>
                  {migrating ? '迁移中…' : '注册并迁移'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}