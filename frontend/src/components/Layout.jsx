import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '首页', emoji: '🏠', end: true },
  { to: '/record', label: '记录', emoji: '✏️' },
  { to: '/timeline', label: '时间线', emoji: '☁️' },
  { to: '/stats', label: '统计', emoji: '📊' },
  { to: '/review', label: '回顾', emoji: '🌙' },
  { to: '/profile', label: '我的', emoji: '🌸' },
];

export default function Layout() {
  return (
    <>
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
        </div>
      </nav>

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