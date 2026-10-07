import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Auth() {
  const [tab, setTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, enterGuest } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) { toast('请输入用户名'); return; }
    if (!password) { toast('请输入密码'); return; }
    if (tab === 'register') {
      if (password.length < 6) { toast('密码至少 6 位'); return; }
      if (password !== password2) { toast('两次输入的密码不一致'); return; }
    }
    setSubmitting(true);
    try {
      if (tab === 'register') {
        const res = await api.register(name, password);
        login(res.token, res.user.username);
        toast('注册成功，欢迎你 ' + res.user.username + ' 🎉');
      } else {
        const res = await api.login(name, password);
        login(res.token, res.user.username);
        toast('欢迎回来，' + res.user.username + ' ☀️');
      }
      navigate('/', { replace: true });
    } catch (err) {
      toast(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-brand">🌤 心情笔记</div>
        <div className="auth-slogan">记录不只是留下文字，更是温柔地记住自己。</div>

        {/* Tab 切换 */}
        <div className="auth-tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>登录</button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>注册</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            className="input"
            placeholder="用户名（2-20 个字符）"
            value={username}
            maxLength={20}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            className="input"
            type="password"
            placeholder={tab === 'register' ? '密码（至少 6 位）' : '密码'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
          />
          {tab === 'register' && (
            <input
              className="input"
              type="password"
              placeholder="再输入一次密码"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          )}
          <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
            {submitting ? '请稍候…' : (tab === 'login' ? '登录' : '注册并登录')}
          </button>
        </form>

        {/* 游客入口 */}
        <div className="auth-guest">
          <div className="auth-divider"><span>或</span></div>
          <button className="btn btn-ghost auth-submit" onClick={() => { enterGuest(); navigate('/', { replace: true }); }}>
            👀 游客模式随便逛逛
          </button>
          <p className="auth-guest-tip">
            游客模式数据<strong>仅保存在本机浏览器</strong>，不会上传到服务器；但<strong>清空浏览器缓存后数据将永久丢失</strong>。建议注册账号，数据会更安全地保存在服务器上。
          </p>
        </div>
      </div>
    </div>
  );
}