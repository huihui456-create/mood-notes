import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const LS_TOKEN = 'mood_notes_token';
const LS_USERNAME = 'mood_notes_username';

// 游客身份常量：localStorage 中存此标记，表示当前是游客模式
const GUEST_MODE = 'mood_notes_guest_mode';

// api 层 401 时的全局回调（由 AuthProvider 注册，api.js 触发）
let onUnauthorized = () => {};
export function setOnUnauthorized(fn) { onUnauthorized = fn; }
export function triggerUnauthorized() { onUnauthorized(); }

export function AuthProvider({ children }) {
  // mode: 'user' | 'guest' | null（null = 未选择，跳登录页）
  const [mode, setMode] = useState(null);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);

  // api 层 401 时触发：登录态失效，清除并回到登录页
  useEffect(() => {
    setOnUnauthorized(() => {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_USERNAME);
      setToken('');
      setUsername('');
      setMode(null);
    });
  }, []);

  // 初始化：从 localStorage 恢复登录态 / 游客态
  useEffect(() => {
    const t = localStorage.getItem(LS_TOKEN);
    const u = localStorage.getItem(LS_USERNAME);
    const guest = localStorage.getItem(GUEST_MODE);
    if (t && u) {
      setMode('user');
      setToken(t);
      setUsername(u);
    } else if (guest === '1') {
      setMode('guest');
    }
    setReady(true);
  }, []);

  const login = useCallback((t, u) => {
    localStorage.setItem(LS_TOKEN, t);
    localStorage.setItem(LS_USERNAME, u);
    localStorage.removeItem(GUEST_MODE);
    setToken(t);
    setUsername(u);
    setMode('user');
  }, []);

  const enterGuest = useCallback(() => {
    localStorage.setItem(GUEST_MODE, '1');
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USERNAME);
    setToken('');
    setUsername('');
    setMode('guest');
  }, []);

  const logout = useCallback(async () => {
    // 尝试通知服务端失效 token（游客登出无 token，跳过）
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      } catch { /* 忽略，前端本地为准 */ }
    }
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USERNAME);
    localStorage.removeItem(GUEST_MODE);
    setToken('');
    setUsername('');
    setMode(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ mode, username, token, ready, login, enterGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}