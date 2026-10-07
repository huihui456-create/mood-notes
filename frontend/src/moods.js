// 心情分类定义（与后端 moods.js 保持一致）
export const MOODS = [
  { key: 'happy',     label: '开心', emoji: '😄', color: '#F5A623', polarity: 1 },
  { key: 'calm',      label: '平静', emoji: '😌', color: '#7FB5D9', polarity: 1 },
  { key: 'anxious',   label: '焦虑', emoji: '😰', color: '#9B8ABF', polarity: -1 },
  { key: 'sad',       label: '悲伤', emoji: '😢', color: '#5B7FA6', polarity: -1 },
  { key: 'angry',     label: '愤怒', emoji: '😠', color: '#E0655A', polarity: -1 },
  { key: 'tired',     label: '疲惫', emoji: '😴', color: '#6E8B74', polarity: 0 },
  { key: 'aggrieved', label: '委屈', emoji: '🥺', color: '#D9A7B0', polarity: 0 },
  { key: 'surprised', label: '惊喜', emoji: '🤩', color: '#D96BA4', polarity: 1 },
];

export const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.key, m]));

export const INTENSITY_LABELS = ['', '很轻', '轻', '一般', '较重', '很重'];

export function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  const [y, m, day] = dateStr.split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
}

export function fmtMonth(dateStr) {
  const [y, m] = dateStr.split('-');
  return `${y}年${Number(m)}月`;
}

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}