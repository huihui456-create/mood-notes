import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { api } from '../api.js';
import { MOODS, MOOD_MAP } from '../moods.js';

const RANGES = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '今年' },
  { key: 'all', label: '全部' },
];

// 计算时间范围参数
function rangeParams(range) {
  const now = new Date();
  if (range === 'week') {
    const day = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    return {
      from: start.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  if (range === 'month') {
    return {
      from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      to: now.toISOString().slice(0, 10),
    };
  }
  if (range === 'year') return { year: String(now.getFullYear()) };
  return {};
}

// 月度日历热力图：以月为单元，每月一小格（类似 GitHub 贡献图按周排列，这里简化按年月小格）
function Heatmap({ data }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.heatmap(year).then(h => {
      const map = {};
      h.days.forEach(d => { map[d.day] = d; });
      setDays(map);
    }).finally(() => setLoading(false));
  }, [year]);

  // 构建一年 12 个月的格子
  const cells = [];
  for (let m = 1; m <= 12; m++) {
    const first = new Date(year, m - 1, 1);
    const dayCount = new Date(year, m, 0).getDate();
    const offset = first.getDay(); // 0=周日
    const list = [];
    for (let i = 0; i < offset; i++) list.push(null);
    for (let d = 1; d <= dayCount; d++) {
      const ds = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      list.push(ds);
    }
    cells.push({ m, list });
  }

  const colorFor = (ds) => {
    const info = days[ds];
    if (!info) return '#F2EDE6';
    const v = info.avgIntensity || info.count || 1;
    // 深浅按记录强度/次数
    const alpha = Math.min(1, (info.count || 1) / 4);
    if (v <= 2) return `rgba(232,168,124,${0.25 + alpha * 0.4})`;
    if (v <= 3) return `rgba(232,168,124,${0.4 + alpha * 0.4})`;
    return `rgba(217,142,95,${0.5 + alpha * 0.45})`;
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayYear = new Date().getFullYear();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => setYear(y => y - 1)}>‹</button>
        <span style={{ fontWeight: 700, minWidth: 60, textAlign: 'center' }}>{year} 年</span>
        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }}
          disabled={year >= todayYear} onClick={() => setYear(y => y + 1)}>›</button>
      </div>
      {loading ? (
        <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>加载日历中…</div>
      ) : (
        <div className="heatmap">
          {cells.map(({ m, list }) => (
            <div className="heat-row" key={m}>
              <div className="heat-label">{m}月</div>
              {list.map((ds, i) => (
                <div
                  key={i}
                  className="heat-cell"
                  style={{ background: ds ? colorFor(ds) : 'transparent' }}
                  title={ds ? (days[ds] ? `${ds} · ${days[ds].count}条` : ds) : ''}
                />
              ))}
            </div>
          ))}
          <div className="heat-legend">
            <span>少</span>
            {[0.2, 0.4, 0.6, 0.8, 1].map(a => (
              <span key={a} className="sw" style={{ background: `rgba(232,168,124,${a * 0.7})` }} />
            ))}
            <span>多</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const [range, setRange] = useState('month');
  const [cards, setCards] = useState(null);
  const distRef = useRef(null);
  const distChart = useRef(null);

  const load = async () => {
    const p = rangeParams(range);
    const data = await api.stats(p);
    setCards(data);
    drawDist(data);
  };

  const drawDist = (data) => {
    if (!distRef.current) return;
    if (!distChart.current) {
      distChart.current = echarts.init(distRef.current);
    }
    const items = MOODS.filter(m => (data.moodDist[m.key] || 0) > 0);
    const chart = distChart.current;
    if (items.length === 0) {
      chart.setOption({
        title: { text: '暂无数据', left: 'center', top: 'middle', textStyle: { color: '#B5AFBF', fontSize: 14, fontWeight: 'normal' } },
        series: [],
      });
      return;
    }
    chart.setOption({
      color: items.map(i => i.color),
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['55%', '78%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: {
          formatter: '{b}\n{c}次',
          fontSize: 12,
          color: '#8C8696',
        },
        labelLine: { smooth: true, length: 8, length2: 6 },
        data: items.map(i => ({
          name: `${i.emoji} ${i.label}`,
          value: data.moodDist[i.key],
        })),
      }],
    });
  };

  useEffect(() => {
    load().catch(e => console.error(e));
    return () => { distChart.current?.dispose(); distChart.current = null; };
  }, [range]);

  useEffect(() => {
    const onResize = () => distChart.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!cards) return <div className="page"><div className="loading">加载中…</div></div>;

  return (
    <div className="page">
      <div className="page-title">📊 我的情绪数据</div>
      <div className="page-sub">数据只呈现，不评判</div>

      <div style={{ marginBottom: 16 }}>
        <div className="seg">
          {RANGES.map(r => (
            <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 数字卡片 */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="num coral">{cards.total}</div>
          <div className="label">记录总次数</div>
        </div>
        <div className="stat-card">
          <div className="num blue">{cards.days}</div>
          <div className="label">记录天数</div>
        </div>
        <div className="stat-card">
          <div className="num coral">{cards.streak}</div>
          <div className="label">最近连续天数</div>
        </div>
        <div className="stat-card">
          <div className="num blue">{cards.total ? Math.round(cards.total / cards.days * 10) / 10 : 0}</div>
          <div className="label">平均每天记录</div>
        </div>
      </div>

      {/* 心情分布 */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>心情分布</div>
        <div ref={distRef} style={{ height: 260, width: '100%' }} />
      </div>

      {/* 日历热力图 */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>日历热力图</div>
        <Heatmap />
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}>色块越深，代表那天记录越多或强度越高。一眼看见自己的坚持节奏。</div>
      </div>
    </div>
  );
}