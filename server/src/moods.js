// 心情分类配置（前后端共用同一套定义，后端用于统计）
// polarity: 1 = 正向, -1 = 负向, 0 = 中性
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

export const VALID_MOOD_KEYS = MOODS.map(m => m.key);

/** 趋势分 = 极性分值 × 强度 */
export function trendScore(moodKey, intensity) {
  const mood = MOOD_MAP[moodKey];
  if (!mood) return 0;
  return mood.polarity * (intensity || 3);
}