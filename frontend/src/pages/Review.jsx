import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { MOOD_MAP, fmtDate, fmtMonth, INTENSITY_LABELS } from '../moods.js';
import { useToast } from '../components/Toast.jsx';

export default function Review() {
  const [records, setRecords] = useState(null);
  const [random, setRandom] = useState(null);
  const toast = useToast();

  const load = () => {
    api.list().then(list => {
      setRecords(list);
      setRandom(null);
    }).catch(e => toast('加载失败：' + e.message));
  };

  useEffect(load, []);

  const pickupRandom = () => {
    const list = records || [];
    if (!list.length) return;
    setRandom(list[Math.floor(Math.random() * list.length)]);
  };

  if (!records) return <div className="page"><div className="loading">加载中…</div></div>;

  // 按月份分组
  const groups = {};
  records.forEach(r => {
    const m = r.recorded_date.slice(0, 7);
    if (!groups[m]) groups[m] = [];
    groups[m].push(r);
  });
  const months = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page">
      <div className="page-title">🌙 回顾</div>
      <div className="page-sub">和过去的自己聊聊天</div>

      {/* 随机回顾 */}
      {random && (
        <div className="card random-card" style={{ marginBottom: 18, background: 'linear-gradient(160deg, #FFF7F0, #F2EEF9)' }}>
          <div className="rc-emoji">{MOOD_MAP[random.mood]?.emoji}</div>
          <div className="rc-date">
            {fmtDate(random.recorded_date)}
            {random.intensity && <span style={{ marginLeft: 8 }}>· {INTENSITY_LABELS[random.intensity]}</span>}
            {random.backfill && <span className="tag tag-backfill" style={{ marginLeft: 8 }}>补记</span>}
          </div>
          {random.content && <div className="rc-content">{random.content}</div>}
          {random.image && (
            <div className="rc-img">
              <img src={random.image} alt="配图" />
            </div>
          )}
          <button className="btn btn-ghost" onClick={pickupRandom} style={{ marginTop: 16 }}>再抽一条 🎲</button>
        </div>
      )}

      {!random && (
        <button className="btn btn-primary" onClick={pickupRandom} style={{ width: '100%', marginBottom: 10, padding: 14 }}>
          🎲 和过去聊聊
        </button>
      )}

      {records.length === 0 && (
        <div className="card empty">
          <div className="empty-emoji">🪐</div>
          <p>还没有值得回顾的过去<br /><Link to="/record" className="link-plain">从今天开始积累 →</Link></p>
        </div>
      )}

      {/* 按月分组的时间线 */}
      {months.map(m => (
        <div key={m}>
          <div className="month-group-title">🏷 {fmtMonth(m)}</div>
          {groups[m].map(r => (
            <div className="record-card" key={r.id}>
              <div className="record-card-head">
                <span className="record-emoji">{MOOD_MAP[r.mood]?.emoji}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{MOOD_MAP[r.mood]?.label}</span>
                {r.intensity && <span className="record-intensity">· {INTENSITY_LABELS[r.intensity]}</span>}
                {r.backfill && <span className="tag tag-backfill">补记</span>}
                <span style={{ marginLeft: 'auto' }} className="record-date">{fmtDate(r.recorded_date)}</span>
              </div>
              {r.content && <div className="record-content">{r.content}</div>}
              {r.image && (
                <div className="record-img">
                  <img src={r.image} alt="配图" loading="lazy" />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}