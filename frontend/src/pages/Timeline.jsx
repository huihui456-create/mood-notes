import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { MOODS, MOOD_MAP, fmtDate, INTENSITY_LABELS } from '../moods.js';
import { useToast } from '../components/Toast.jsx';
import { ConfirmModal } from '../components/Confirm.jsx';

const FILTER = ['全部', ...MOODS.map(m => m.key)];

export default function Timeline() {
  const [records, setRecords] = useState(null);
  const [moodFilter, setMoodFilter] = useState('');
  const [year, setYear] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const toast = useToast();

  const load = () => {
    api.list({ mood: moodFilter, year }).then(setRecords).catch(e => toast('加载失败：' + e.message));
  };

  useEffect(load, [moodFilter, year]);

  const handleDelete = async () => {
    try {
      await api.remove(confirmDel.id);
      toast('已删除');
      setConfirmDel(null);
      setDetail(null);
      load();
    } catch (e) {
      toast('删除失败：' + e.message);
    }
  };

  if (!records) return <div className="page"><div className="loading">加载中…</div></div>;

  return (
    <div className="page">
      <div className="page-title">☁️ 时间线</div>
      <div className="page-sub">回看每一刻的心情</div>

      {/* 筛选工具栏 */}
      <div className="toolbar">
        <div className="seg">
          {FILTER.map((f, i) => (
            <button key={f} className={moodFilter === (i === 0 ? '' : f) ? 'active' : ''}
              onClick={() => setMoodFilter(i === 0 ? '' : f)}>
              {i === 0 ? '全部' : MOOD_MAP[f].label}
            </button>
          ))}
        </div>
        <input type="month" className="input" style={{ maxWidth: 160 }}
          value={year ? `${year}-01` : ''}
          onChange={e => {
            const v = e.target.value;
            setYear(v ? v.slice(0, 4) : '');
          }}
        />
      </div>

      {records.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji">🍃</div>
          <p>这段时间还没有记录<br /><Link to="/record" className="link-plain">记一条新的 →</Link></p>
        </div>
      ) : (
        records.map(r => (
          <div key={r.id} className="record-card" onClick={() => setDetail(r)}>
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
        ))
      )}

      {/* 详情弹窗 */}
      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
            <div className="dm-mood">{MOOD_MAP[detail.mood]?.emoji} {MOOD_MAP[detail.mood]?.label}
              {detail.intensity && <span style={{ fontSize: 13, color: 'var(--ink-soft)', marginLeft: 8 }}>强度 {INTENSITY_LABELS[detail.intensity]} · {detail.intensity}/5</span>}
            </div>
            <div className="dm-meta">{fmtDate(detail.recorded_date)} · {detail.created_at?.slice(0, 16).replace('T', ' ')}
              {detail.backfill && <span className="tag tag-backfill" style={{ marginLeft: 6 }}>补记</span>}
            </div>
            {detail.content && <div className="dm-content">{detail.content}</div>}
            {detail.image && (
              <div className="dm-img">
                <img src={detail.image} alt="配图" />
              </div>
            )}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-danger-ghost" onClick={() => setConfirmDel(detail)}>删除</button>
              <Link className="btn btn-primary" to={`/record?edit=${detail.id}`}
                style={{ textDecoration: 'none' }} onClick={() => setDetail(null)}>编辑</Link>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {confirmDel && (
        <ConfirmModal
          title="删除这条记录？"
          text="删除后无法恢复，图片也会一起删除。"
          confirmText="删除"
          danger
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}