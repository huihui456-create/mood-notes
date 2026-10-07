import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { MOOD_MAP, fmtDate, INTENSITY_LABELS, todayStr } from '../moods.js';
import { useToast } from '../components/Toast.jsx';

export default function Home() {
  const [records, setRecords] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  const today = todayStr();

  const load = async () => {
    try {
      const [list, st] = await Promise.all([api.list(), api.stats()]);
      setRecords(list);
      setStats(st);
    } catch (e) {
      toast('加载失败：' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (loading) return <div className="page"><div className="loading">加载中…</div></div>;

  const todayRecords = records.filter(r => r.recorded_date === today);
  const latest = todayRecords[0] || records[0];

  return (
    <div className="page">
      <div className="page-title">🌤 你好呀，今天过得好吗？</div>
      <div className="page-sub">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>

      {/* 今日心情卡片 */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #FFF7F0, #FDF0E4)', marginBottom: 16 }}>
        {todayRecords.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 30 }}>{MOOD_MAP[todayRecords[0].mood]?.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>今天记了 {todayRecords.length} 条心情</div>
                <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                  {MOOD_MAP[todayRecords[0].mood]?.label}
                  {todayRecords[0].intensity ? ` · ${INTENSITY_LABELS[todayRecords[0].intensity]}` : ''}
                </div>
              </div>
            </div>
            <Link to="/timeline" className="link-plain" style={{ fontSize: 13 }}>查看全部今天的心情 →</Link>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>今天还没有记录，记一条吧 ✍️</div>
            <div style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 14 }}>10 秒钟，选一个心情，跟自己说说话。</div>
            <button className="btn btn-primary" onClick={() => navigate('/record')}>去记录</button>
          </>
        )}
      </div>

      {/* 数据速览 */}
      <div className="summary-row">
        <div className="summary-pill">
          <div className="sp-num">{stats.total}</div>
          <div className="sp-label">总记录</div>
        </div>
        <div className="summary-pill">
          <div className="sp-num">{stats.days}</div>
          <div className="sp-label">记录天数</div>
        </div>
        <div className="summary-pill">
          <div className="sp-num">{stats.streak}</div>
          <div className="sp-label">连续天数</div>
        </div>
      </div>

      {/* 最近记录 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 10px' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>最近记录</span>
        <Link to="/timeline" className="link-plain" style={{ fontSize: 13 }}>全部 →</Link>
      </div>
      {records.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji">🌱</div>
          <p>还没有任何记录<br />从今天的第一条心情开始吧</p>
        </div>
      ) : (
        records.slice(0, 5).map(r => (
          <Link key={r.id} to="/timeline" className="record-card">
            <div className="record-card-head">
              <span className="record-emoji">{MOOD_MAP[r.mood]?.emoji}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{MOOD_MAP[r.mood]?.label}</span>
              {r.backfill && <span className="tag tag-backfill">补记</span>}
              <span style={{ marginLeft: 'auto' }} className="record-date">{fmtDate(r.recorded_date)}</span>
            </div>
            {r.content && <div className="record-content">{r.content}</div>}
          </Link>
        ))
      )}
    </div>
  );
}