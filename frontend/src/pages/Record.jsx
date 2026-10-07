import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { MOODS, INTENSITY_LABELS, todayStr } from '../moods.js';
import { useToast } from '../components/Toast.jsx';

const EMOJI_RANGE = ['😐', '🙂', '😊', '😄', '🤗'];

export default function Record() {
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const navigate = useNavigate();
  const toast = useToast();

  const [mood, setMood] = useState('');
  const [intensity, setIntensity] = useState(3);
  const [useIntensity, setUseIntensity] = useState(true);
  const [content, setContent] = useState('');
  const [date, setDate] = useState(todayStr());
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [isEdit, setIsEdit] = useState(false);
  const fileRef = useRef(null);

  // 编辑模式加载
  React.useEffect(() => {
    if (!editId) return;
    api.get(editId).then(r => {
      setMood(r.mood);
      if (r.intensity) { setIntensity(r.intensity); setUseIntensity(true); }
      else setUseIntensity(false);
      setContent(r.content);
      setDate(r.recorded_date);
      if (r.image) setImageUrl(r.image);
      setIsEdit(true);
    }).catch(e => toast('加载失败：' + e.message)).finally(() => setLoading(false));
  }, [editId]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('请选择图片文件'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('图片不能超过 5MB'); return; }
    setUploading(true);
    try {
      const r = await api.uploadImage(file);
      setImageUrl(r.url);
    } catch (e) {
      toast('上传失败：' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!mood) { toast('先选一个心情吧'); return; }
    setSaving(true);
    try {
      const payload = {
        mood,
        intensity: useIntensity ? intensity : null,
        content,
        image: imageUrl,
        recorded_date: date,
      };
      const result = isEdit ? await api.update(editId, payload) : await api.create(payload);
      const isBackfill = result.recorded_date < todayStr() || result.backfill;
      toast(isBackfill ? '已补记保存 📝' : '已记录 ✨');
      navigate('/timeline');
    } catch (e) {
      toast('保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page"><div className="loading">加载中…</div></div>;

  return (
    <div className="page">
      <div className="page-title">{isEdit ? '编辑这条心情' : '记一条心情'}</div>
      <div className="page-sub">{isEdit ? '' : '10 秒钟，留住当下的情绪'}</div>

      {/* 心情选择 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>此刻的心情 <span style={{ color: 'var(--accent-deep)' }}>*</span></div>
        <div className="mood-grid">
          {MOODS.map(m => (
            <button
              key={m.key}
              className={`mood-btn ${mood === m.key ? 'selected' : ''}`}
              style={mood === m.key ? { borderColor: m.color, background: m.color + '14' } : {}}
              onClick={() => setMood(m.key)}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>

        {/* 强度 */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>感受强度</span>
            <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={useIntensity} onChange={e => setUseIntensity(e.target.checked)} />
              不选
            </label>
          </div>
          {useIntensity ? (
            <div className="strength-row">
              <span>{EMOJI_RANGE[0]}</span>
              <input
                type="range" min="1" max="5" step="1"
                value={intensity}
                onChange={e => setIntensity(Number(e.target.value))}
              />
              <span>{EMOJI_RANGE[4]}</span>
              <div className="strength-value">{INTENSITY_LABELS[intensity]} {intensity}/5</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '8px 0' }}>本次不记录强度</div>
          )}
        </div>
      </div>

      {/* 描述 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>发生了什么？<span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>（可留空）</span></div>
        <textarea
          className="textarea"
          placeholder="现在发生了什么？是什么让你有这种感受？"
          value={content}
          maxLength={5000}
          onChange={e => setContent(e.target.value)}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{content.length}/5000</div>
      </div>

      {/* 配图 */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>配一张图 <span style={{ fontWeight: 400, color: 'var(--ink-soft)', fontSize: 12 }}>（可留空）</span></div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files[0])} />
        {imageUrl ? (
          <div className="preview-img">
            <img src={imageUrl} alt="记录配图" />
            <button className="remove-btn" onClick={() => { setImageUrl(null); if (fileRef.current) fileRef.current.value = ''; }}>×</button>
          </div>
        ) : (
          <div className="upload-box" onClick={() => fileRef.current?.click()}>
            <div className="up-icon">🖼</div>
            <div>{uploading ? '上传中…' : '点击选择一张图片（≤5MB）'}</div>
          </div>
        )}
      </div>

      {/* 日期 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          记录时间
          {date < todayStr() && <span className="tag tag-backfill" style={{ marginLeft: 8 }}>补记</span>}
        </div>
        <input type="date" className="input" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} />
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>选择过去的日期可补记往日心情，会带上"补记"标记</div>
      </div>

      <button className={`btn btn-primary ${saving ? 'btn-disabled' : ''}`} style={{ width: '100%', padding: '14px' }} onClick={handleSave}>
        {saving ? '保存中…' : (isEdit ? '保存修改' : '保存心情')}
      </button>
    </div>
  );
}