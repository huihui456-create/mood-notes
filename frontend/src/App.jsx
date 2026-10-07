import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Record from './pages/Record.jsx';
import Timeline from './pages/Timeline.jsx';
import Stats from './pages/Stats.jsx';
import Review from './pages/Review.jsx';
import Profile from './pages/Profile.jsx';
import Auth from './pages/Auth.jsx';
import { useAuth } from './auth.jsx';
import { setAuthGetter } from './api.js';

// 身份门卫：未选择身份（未登录也非游客）时统一跳转登录页
function AuthGuard({ children }) {
  const { mode, ready } = useAuth();
  const location = useLocation();
  // 登录页自身不拦截
  if (location.pathname === '/auth') return children;
  if (!ready) return null;
  if (!mode) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const auth = useAuth();

  // 渲染期间同步把认证状态注入 api 层，确保任一组件的首次数据请求
  // （子组件 useEffect 早于父组件 useEffect 执行）都能拿到最新身份，
  // 避免游客/登录分流读到旧状态而误发服务端请求。
  setAuthGetter(() => ({ token: auth.token, mode: auth.mode }));

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
        <Route index element={<Home />} />
        <Route path="record" element={<Record />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="stats" element={<Stats />} />
        <Route path="review" element={<Review />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}