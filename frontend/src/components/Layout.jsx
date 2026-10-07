import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const NAV_ITEMS = [
  { to: '/', label: '首页', emoji: '🏠', end: true },
  { to: '/record', label: '记录', emoji: '✏️' },
  { to: '/timeline', label: '时间线', emoji: '☁️' },
  { to: '/stats', label: '统计', emoji: '📊' },
  { to: '/review', label: '回顾', emoji: '🌙' },
  { to: '/profile', label: '我的', emoji: '🌸' },
];

export default function Layout() {
  const { mode, username, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth', { replace: true });
  };

  return (
    <>
      {/* 游客模式常驻提示条 */}
      {mode === 'guest' && (
        <div className="guest-banner">
          <span>👀 游客模式</span>
          <span className="guest-banner-text">数据仅保存在本机浏览器，清空浏览器缓存后数据将丢失</span>
          <button className="guest-banner-btn" onClick={() => navigate('/profile')}>注册保存</button>
        </div>
      )}

      <nav className="top-nav">
        <div className="top-nav-inner">
          <NavLink to="/" className="brand">🌤 心情笔记</NavLink>
          <div className="top-nav-links">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {item.emoji} {item.label}
              </NavLink>
            ))}
          </div>
          {/* 身份区：用户名 / 游客 / 退出 */}
          <div className="top-nav-user">
            {mode === 'user' ? (
              <>
                <span className="user-chip">🌸 {username}</span>
                <button className="logout-btn" onClick={handleLogout} title="退出登录">退出</button>
              </>
            ) : (
              <span className="user-chip guest-chip">👀 游客</span>
            )}
          </div>
        </div>
      </nav>

      {/* 移动端常驻「我的」入口（页面右上方），游客模式下让出提示条空间 */}
      <NavLink
        to="/profile"
        className="mobile-profile-entry"
        aria-label="我的"
        style={mode === 'guest' ? { top: 52 } : undefined}
      >
        🌸
      </NavLink>

      <Outlet />

      <nav className="bottom-nav">
        {NAV_ITEMS.slice(0, 5).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="nav-emoji">{item.emoji}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}