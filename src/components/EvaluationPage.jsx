import { useMemo, useState, useRef } from 'react';
import {
  buildEvalStudents, computeClassStats,
  EVAL_DIM_KEYS, EVAL_DIM_LABELS, EVAL_DIM_COLORS, EVAL_DIM_ICONS,
  STAGE_LABELS, STAGE_COLORS, WEEK_LABELS, WEEKS,
} from '../data/evaluationData';
import { getStoredStudents, saveStudents, parseCSVText } from '../utils/studentDataStore';
import { DataManagementModal } from './DataManagementModal';
import './toolPages.css';

// ── 颜色工具 ─────────────────────────────────────────────────────────────
const ACCENT = '#10a37f';
const CARD = {
  background: 'linear-gradient(180deg,rgba(255,255,253,.95) 0%,rgba(252,252,248,.88) 100%)',
  border: '1px solid rgba(31,31,26,.08)',
  borderRadius: 16,
  boxShadow: '0 2px 12px -6px rgba(28,32,24,.14)',
};
const STEP_META = [
  { label: '数据采集', icon: '📡', color: '#3b82f6' },
  { label: '数字画像', icon: '🎯', color: '#8b5cf6' },
  { label: '动态评价', icon: '📊', color: '#10a37f' },
  { label: '精准反馈', icon: '💬', color: '#f59e0b' },
  { label: '迭代优化', icon: '🔄', color: '#ec4899' },
];
function scoreColor(v) {
  if (v >= 85) return '#10a37f';
  if (v >= 70) return '#3b82f6';
  if (v >= 60) return '#f59e0b';
  return '#ef4444';
}
function dimColor(key) {
  return EVAL_DIM_COLORS[EVAL_DIM_KEYS.indexOf(key)] || '#999';
}

// ── 六维雷达图 SVG ────────────────────────────────────────────────────────
function EvalRadar({ dimsList, labels = EVAL_DIM_LABELS, size = 220, colors }) {
  const W = size, H = size, cx = W / 2, cy = H / 2, R = size * 0.36;
  const n = labels.length;
  const angle = i => (i / n) * 2 * Math.PI - Math.PI / 2;
  const toXY = (v, max, i) => {
    const r = (v / max) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const labelColors = colors || EVAL_DIM_COLORS;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
    >
      {gridLevels.map(lv => (
        <polygon key={lv}
          points={labels.map((_, i) => { const [x, y] = toXY(10 * lv, 10, i); return `${x},${y}`; }).join(' ')}
          fill="none" stroke="#e5e7eb" strokeWidth={0.8} />
      ))}
      {labels.map((_, i) => {
        const [x, y] = toXY(10, 10, i);
        const lx = cx + (R + 18) * Math.cos(angle(i));
        const ly = cy + (R + 18) * Math.sin(angle(i));
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={0.8} />
            <text x={lx} y={ly + 3.5} textAnchor="middle" fontSize={size < 200 ? 8 : 9.5}
              fill={labelColors[i]} fontWeight="600">{labels[i]}</text>
          </g>
        );
      })}
      {dimsList.map((dims, si) => {
        const col = colors ? colors[si] : EVAL_DIM_COLORS[si % EVAL_DIM_COLORS.length];
        const pts = EVAL_DIM_KEYS.map((k, i) => { const [x, y] = toXY(dims[k], 10, i); return `${x},${y}`; }).join(' ');
        return (
          <g key={si}>
            <polygon points={pts} fill={col} fillOpacity={0.13} stroke={col} strokeWidth={2} />
            {EVAL_DIM_KEYS.map((k, i) => {
              const [x, y] = toXY(dims[k], 10, i);
              return <circle key={i} cx={x} cy={y} r={3.2} fill={col} />;
            })}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={2} fill="#d1d5db" />
    </svg>
  );
}

// ── 折线成长图 SVG ───────────────────────────────────────────────────────
function GrowthLine({ lines, labels = WEEK_LABELS, yMin = 4, yMax = 10, W = 480, H = 140 }) {
  const padL = 36, padR = 16, padT = 12, padB = 28;
  const iW = W - padL - padR, iH = H - padT - padB;
  const xScale = (i) => padL + (i / (labels.length - 1)) * iW;
  const yScale = (v) => padT + iH - ((v - yMin) / (yMax - yMin)) * iH;
  const gridYs = [4, 5, 6, 7, 8, 9, 10].filter(v => v >= yMin && v <= yMax);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
    >
      {gridYs.map(v => (
        <g key={v}>
          <line x1={padL} y1={yScale(v)} x2={W - padR} y2={yScale(v)} stroke="#f0f0ee" strokeWidth={v % 2 === 0 ? 1 : 0.5} />
          <text x={padL - 4} y={yScale(v) + 3.5} textAnchor="end" fontSize={8} fill="#9ca3af">{v}</text>
        </g>
      ))}
      {labels.map((lb, i) => (
        <text key={i} x={xScale(i)} y={H - 4} textAnchor="middle" fontSize={8.5} fill="#9ca3af">{lb}</text>
      ))}
      {lines.map(({ data, color, name }, li) => {
        const pts = data.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
        return (
          <g key={li}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {data.map((v, i) => (
              <circle key={i} cx={xScale(i)} cy={yScale(v)} r={2.8} fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── 小进度条 ─────────────────────────────────────────────────────────────
function MiniBar({ value, max = 10, color = ACCENT, height = 6, showLabel = false }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height, background: 'rgba(0,0,0,.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .4s' }} />
      </div>
      {showLabel && <span style={{ fontSize: 10, color: '#6b7280', minWidth: 24 }}>{value.toFixed(1)}</span>}
    </div>
  );
}

// ── 评分徽章 ─────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const color = scoreColor(score);
  return (
    <span style={{
      display: 'inline-block', padding: '1px 8px', borderRadius: 99,
      background: `${color}18`, color, fontSize: 11, fontWeight: 700, border: `1px solid ${color}40`
    }}>{score.toFixed(1)}</span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// 主页面
// ══════════════════════════════════════════════════════════════════════════
export function EvaluationPage() {
  const [currentStudents, setCurrentStudents] = useState(() => getStoredStudents());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [view, setView] = useState('teacher');
  const [selectedId, setSelectedId] = useState(null);

  const pageFileInputRef = useRef(null);

  const handlePageCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const importedList = parseCSVText(text);

      if (importedList.length > 0) {
        saveStudents(importedList);
        setCurrentStudents(importedList);
        setSelectedId(null);
        alert(`成功导入 ${importedList.length} 条学生数据！`);
      } else {
        alert("未能识别到有效的学生数据，请检查 CSV 模板格式。");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const evalStudents = useMemo(() => buildEvalStudents(currentStudents), [currentStudents]);
  const classStats   = useMemo(() => computeClassStats(evalStudents), [evalStudents]);
  const selected     = selectedId ? evalStudents.find(s => s.id === selectedId) : null;
  const sortedByScore = useMemo(() =>
    evalStudents.slice().sort((a, b) => b.score.total - a.score.total), [evalStudents]);

  // ── 顶部标题栏 ──────────────────────────────────────────────────────────
  const Header = () => (
    <div className="tool-surface-panel evaluation-toolbar">
      <div className="evaluation-toolbar-copy">
        <span
          className="tool-page-kicker"
          style={{ background: 'rgba(16, 163, 127, 0.1)', color: '#0f5f4d', border: '1px solid rgba(16, 163, 127, 0.24)' }}
        >
          数字画像、评分、反馈与成长轨迹联动
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <h2 style={{ margin: 0 }}>{evalStudents.length} 名学生的全链路评价看板</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              background: '#10a37f',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(16, 163, 127, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.background = '#0d8a6a'}
            onMouseOut={(e) => e.target.style.background = '#10a37f'}
          >
            📁 管理学生数据
          </button>
          <button 
            onClick={() => pageFileInputRef.current.click()}
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.background = '#4338ca'}
            onMouseOut={(e) => e.target.style.background = '#4f46e5'}
          >
            📤 导入名单 (CSV)
          </button>
          <input 
            type="file" 
            ref={pageFileInputRef} 
            style={{ display: "none" }} 
            accept=".csv" 
            onChange={handlePageCSVUpload} 
          />
        </div>
        <p>把课前数据、弹性分组、AI 对话和课后反馈放在同一视图里，先看全班，再下钻到单个学生。</p>
      </div>
      <div className="evaluation-toolbar-controls">
        <div className="evaluation-toggle-group">
          {[['teacher', '教师视角'], ['student', '学生视角']].map(([v, lb]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={view === v ? 'evaluation-toggle-button is-active' : 'evaluation-toggle-button'}
            >
              <strong>{lb}</strong>
            </button>
          ))}
        </div>
        <select
          className="evaluation-select"
          value={selectedId || ''}
          onChange={e => setSelectedId(e.target.value || null)}
        >
          <option value="">全班概览</option>
          {sortedByScore.map(s => (
            <option key={s.id} value={s.id}>{s.name}（{s.score.total.toFixed(0)}分·{s.style}）</option>
          ))}
        </select>
      </div>
    </div>
  );

  // ── 五步流程导航 ────────────────────────────────────────────────────────
  const PipelineNav = () => (
    <div className="evaluation-pipeline">
      {STEP_META.map((s, i) => {
        const active = step === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={active ? 'evaluation-pipeline-button is-active' : 'evaluation-pipeline-button'}
            style={{ '--step-color': s.color }}
          >
            <span>{s.icon}</span>
            <strong>{`${i + 1}. ${s.label}`}</strong>
          </button>
        );
      })}
    </div>
  );

  // ══ Step 0：数据采集 ════════════════════════════════════════════════════
  const StepCollection = () => {
    const sources = [
      { label: '课前数据收集', desc: '自评问卷 + 诊断练习', count: evalStudents.length, icon: '📋', color: '#10a37f' },
      { label: '弹性分组诊断', desc: '五维学情智能分组', count: evalStudents.length, icon: '🧩', color: '#6366f1' },
      { label: 'AI 对话记录', desc: '多轮问答 + 提问深度', count: evalStudents.reduce((s, st) => s + st.dialogue.sessions, 0), icon: '🤖', color: '#3b82f6' },
      { label: '课后反馈采集', desc: '拉格朗日作业 + 反思', count: evalStudents.length, icon: '📝', color: '#f59e0b' },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 数据源卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {sources.map((src, i) => (
            <div key={i} style={{ ...CARD, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22 }}>{src.icon}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${src.color}16`, color: src.color, fontWeight: 600 }}>已接入</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#111827' }}>{src.label}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{src.desc}</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: src.color }}>{src.count}<span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginLeft: 3 }}>条记录</span></div>
            </div>
          ))}
        </div>

        {/* 每位学生数据完整度 */}
        <div style={{ ...CARD, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>学生数据完整度总览</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '8px 16px' }}>
            {evalStudents.map(st => {
              const completeness = Math.round(70 + st.dialogue.sessions * 1.5 + st.participation * 0.5);
              const pct = Math.min(100, completeness);
              return (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#374151', minWidth: 52, fontWeight: st.type === 'A' ? 600 : 400 }}>{st.name}</span>
                  <div style={{ flex: 1, height: 5, background: 'rgba(0,0,0,.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: scoreColor(pct), borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#9ca3af', minWidth: 28 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI 对话统计 */}
        <div style={{ ...CARD, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>AI 对话行为分布（会话数 & 提问深度）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            {sortedByScore.map(st => (
              <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 180px', minWidth: 0 }}>
                <span style={{ fontSize: 11, color: '#374151', minWidth: 38 }}>{st.name}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(st.dialogue.sessions / 20) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 10, color: '#3b82f6', minWidth: 20 }}>{st.dialogue.sessions}</span>
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#8b5cf618', color: '#8b5cf6', fontWeight: 600 }}>深{st.dialogue.depth}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ══ Step 1：数字画像 ════════════════════════════════════════════════════
  const StepPortrait = () => {
    const isClass = !selected;
    const displayStudent = selected || null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 行1：雷达图 + 维度统计 */}
        <div style={{ display: 'grid', gridTemplateColumns: isClass ? 'repeat(auto-fit,minmax(280px,1fr))' : 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
          {/* 雷达图 */}
          <div style={{ ...CARD, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              {isClass ? '全班平均六维画像' : `${displayStudent.name} · 个人画像`}
            </div>
            <EvalRadar
              dimsList={isClass ? [classStats.avgDims] : [displayStudent.dims]}
              colors={isClass ? [ACCENT] : [EVAL_DIM_COLORS[0]]}
              size={200}
            />
            {!isClass && (
              <div style={{ marginTop: 8, padding: '4px 12px', borderRadius: 99, background: `${ACCENT}15`, color: ACCENT, fontSize: 11, fontWeight: 700, border: `1px solid ${ACCENT}30` }}>
                {displayStudent.style}
              </div>
            )}
            {isClass && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                全班均值 · 综合 {(Object.values(classStats.avgDims).reduce((a, b) => a + b, 0) / 6).toFixed(1)}/10
              </div>
            )}
          </div>

          {/* 各维度详情 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
            {EVAL_DIM_KEYS.map((key, ki) => {
              const color = EVAL_DIM_COLORS[ki];
              const val = isClass ? classStats.avgDims[key] : displayStudent.dims[key];
              const rank = isClass ? null : sortedByScore.findIndex(s => s.id === displayStudent.id) + 1;
              return (
                <div key={key} style={{ ...CARD, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{EVAL_DIM_ICONS[ki]}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color }}>{val.toFixed(1)}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{EVAL_DIM_LABELS[ki]}</div>
                  <MiniBar value={val} color={color} height={5} />
                  {!isClass && (
                    <div style={{ marginTop: 5, fontSize: 10, color: '#9ca3af' }}>
                      班级第 <span style={{ color, fontWeight: 700 }}>
                        {evalStudents.slice().sort((a, b) => b.dims[key] - a.dims[key]).findIndex(s => s.id === displayStudent.id) + 1}
                      </span> · 均{classStats.avgDims[key].toFixed(1)}
                    </div>
                  )}
                  {isClass && (
                    <div style={{ marginTop: 5, fontSize: 10, color: '#9ca3af' }}>
                      最高 {Math.max(...evalStudents.map(s => s.dims[key])).toFixed(1)} · 最低 {Math.min(...evalStudents.map(s => s.dims[key])).toFixed(1)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 个人：知识热力图 */}
          {!isClass && (
            <div style={{ ...CARD, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>知识掌握热力图</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 7 }}>
                {['梯形法', '辛普森法', '牛顿-科特斯', '拉格朗日插值', '牛顿均差', 'Hermite插值'].map((topic, ti) => {
                  const val = Math.min(10, displayStudent.dims.knowledge * (0.85 + 0.15 * ((ti % 3) / 2 - 0.5)));
                  const pct = Math.round(val * 10);
                  const col = val >= 8 ? '#10a37f' : val >= 6 ? '#3b82f6' : val >= 4 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={ti} style={{ padding: '7px 10px', borderRadius: 9, background: `${col}12`, border: `1px solid ${col}25` }}>
                      <div style={{ fontSize: 10, color: '#374151', fontWeight: 500 }}>{topic}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,.07)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 9, color: col, fontWeight: 700 }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 行2：全班画像热力矩阵 */}
        {isClass && (
          <div style={{ ...CARD, padding: '16px 18px', overflowX: 'auto' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>全班六维画像矩阵</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6b7280', fontWeight: 600, width: 60 }}>学生</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', color: '#6b7280', fontWeight: 600 }}>类型</th>
                  {EVAL_DIM_LABELS.map((lb, i) => (
                    <th key={i} style={{ textAlign: 'center', padding: '4px 6px', color: EVAL_DIM_COLORS[i], fontWeight: 700, fontSize: 10 }}>{lb}</th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '4px 8px', color: '#374151', fontWeight: 700 }}>学习风格</th>
                </tr>
              </thead>
              <tbody>
                {sortedByScore.map((st, ri) => (
                  <tr key={st.id} style={{ background: ri % 2 === 0 ? 'rgba(0,0,0,.018)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedId(st.id)}>
                    <td style={{ padding: '5px 8px', fontWeight: 600, color: '#1f2937' }}>{st.name}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#e5e7eb', color: '#6b7280' }}>{st.type}</span>
                    </td>
                    {EVAL_DIM_KEYS.map((k, ki) => {
                      const v = st.dims[k];
                      const col = EVAL_DIM_COLORS[ki];
                      const opacity = 0.1 + (v / 10) * 0.7;
                      return (
                        <td key={k} style={{ padding: '5px 6px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', width: 36, padding: '2px 0', borderRadius: 5, background: `${col}`, opacity, color: '#fff', fontWeight: 700, fontSize: 10 }}>
                            {v.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontSize: 10, color: '#6b7280' }}>{st.style}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ margin: '8px 0 0', fontSize: 10, color: '#9ca3af' }}>点击任意行查看学生个人画像详情</p>
          </div>
        )}
      </div>
    );
  };

  // ══ Step 2：动态评价 ════════════════════════════════════════════════════
  const StepScoring = () => {
    const displayStudent = selected || null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 评分分解卡片 */}
        {displayStudent ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            {[
              { label: '过程性评价', key: 'process', max: 40, color: '#10a37f', desc: '参与 + 五阶 + AI对话' },
              { label: '结果性评价', key: 'result',  max: 30, color: '#6366f1', desc: '知识 + 计算维度' },
              { label: '成长增量',   key: 'growth',  max: 20, color: '#f59e0b', desc: '第1周→第6周提升' },
              { label: '同伴互评',   key: 'peer',    max: 10, color: '#ec4899', desc: '协作贡献度换算' },
              { label: '综合得分',   key: 'total',   max: 100, color: scoreColor(displayStudent.score.total), desc: '满分 100 分' },
            ].map(({ label, key, max, color, desc }) => (
              <div key={key} style={{ ...CARD, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color, margin: '4px 0 2px', lineHeight: 1 }}>
                  {displayStudent.score[key].toFixed(key === 'total' ? 1 : 1)}
                </div>
                <MiniBar value={displayStudent.score[key]} max={max} color={color} height={5} />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 5 }}>{desc}</div>
              </div>
            ))}
          </div>
        ) : (
          /* 全班评分统计 */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            {[
              { label: '班级平均分', value: classStats.avgTotal.toFixed(1), color: scoreColor(classStats.avgTotal), unit: '分' },
              { label: '优秀率 (≥85)', value: `${Math.round(evalStudents.filter(s => s.score.total >= 85).length / evalStudents.length * 100)}%`, color: '#10a37f', unit: '' },
              { label: '良好率 (70-85)', value: `${Math.round(evalStudents.filter(s => s.score.total >= 70 && s.score.total < 85).length / evalStudents.length * 100)}%`, color: '#3b82f6', unit: '' },
              { label: '待提升 (<60)', value: `${evalStudents.filter(s => s.score.total < 60).length}`, color: '#ef4444', unit: '人' },
            ].map(({ label, value, color, unit }) => (
              <div key={label} style={{ ...CARD, padding: '16px 18px' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1.2 }}>{value}<span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af', marginLeft: 2 }}>{unit}</span></div>
              </div>
            ))}
          </div>
        )}

        {/* 五阶完成率 */}
        <div style={{ ...CARD, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
            五阶问题链完成率 {!displayStudent && '（全班均值）'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STAGE_LABELS.map((lb, si) => {
              const val = displayStudent
                ? displayStudent.stages[si]
                : Math.round(evalStudents.reduce((s, st) => s + st.stages[si], 0) / evalStudents.length);
              const color = STAGE_COLORS[si];
              return (
                <div key={si} style={{ display: 'grid', gridTemplateColumns: 'minmax(88px,100px) 1fr 48px', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{si + 1}</span>
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{lb}</span>
                  </div>
                  <div style={{ height: 10, background: 'rgba(0,0,0,.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${val}%`, height: '100%', background: `linear-gradient(90deg, ${color}cc, ${color})`, borderRadius: 99, transition: 'width .5s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color, textAlign: 'right' }}>{val}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 全班排行榜 */}
        <div style={{ ...CARD, padding: '16px 18px', overflowX: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>全班评分排行榜</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0ee' }}>
                {['排名', '姓名', '类型', '过程(40)', '结果(30)', '增量(20)', '互评(10)', '综合', ''].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: h === '姓名' ? 'left' : 'center', color: '#9ca3af', fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedByScore.map((st, ri) => (
                <tr key={st.id} style={{ borderBottom: '1px solid rgba(0,0,0,.04)', background: selected?.id === st.id ? `${ACCENT}0a` : 'transparent', cursor: 'pointer' }}
                  onClick={() => setSelectedId(st.id === selectedId ? null : st.id)}>
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: ri < 3 ? ['#f59e0b', '#9ca3af', '#cd7f32'][ri] : '#9ca3af', fontSize: 13 }}>
                    {ri < 3 ? ['🥇', '🥈', '🥉'][ri] : ri + 1}
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1f2937' }}>{st.name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#e5e7eb', color: '#6b7280' }}>{st.type}</span>
                  </td>
                  {['process', 'result', 'growth', 'peer'].map(k => (
                    <td key={k} style={{ padding: '6px 8px', textAlign: 'center', color: '#374151' }}>{st.score[k].toFixed(1)}</td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}><ScoreBadge score={st.score.total} /></td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, color: '#9ca3af' }}>{st.style}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ══ Step 3：精准反馈 ════════════════════════════════════════════════════
  const StepFeedback = () => {
    const displayStudent = selected || evalStudents[0];
    const { strengths, improves, alerts } = displayStudent.feedback;

    // 找到最强/最弱维度
    const sortedDims = EVAL_DIM_KEYS.slice().sort((a, b) => displayStudent.dims[b] - displayStudent.dims[a]);
    const topDim = sortedDims[0];
    const weakDim = sortedDims[sortedDims.length - 1];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 个人反馈卡 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          {/* 优势 */}
          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16 }}>✨</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{displayStudent.name} — 突出优势</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#10a37f14', color: '#10a37f', fontWeight: 600 }}>
                最强：{EVAL_DIM_LABELS[EVAL_DIM_KEYS.indexOf(topDim)]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {strengths.map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#10a37f', fontSize: 14, flexShrink: 0, marginTop: 1 }}>●</span>
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 提升 */}
          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16 }}>🎯</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>优先提升方向</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#f59e0b14', color: '#d97706', fontWeight: 600 }}>
                待加强：{EVAL_DIM_LABELS[EVAL_DIM_KEYS.indexOf(weakDim)]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {improves.map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#f59e0b', fontSize: 14, flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 推荐学习路径 */}
        <div style={{ ...CARD, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>🗺️ 推荐学习路径</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
            {[
              { step: '巩固', desc: `强化${EVAL_DIM_LABELS[EVAL_DIM_KEYS.indexOf(weakDim)]}`, color: '#10a37f', icon: '📖' },
              { step: '练习', desc: '配套弹性分组深化', color: '#6366f1', icon: '✏️' },
              { step: '应用', desc: '五阶第4/5阶攻关', color: '#f59e0b', icon: '🧪' },
              { step: '转化', desc: '师范情境教学练习', color: '#ec4899', icon: '🏫' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 10px', borderRadius: 14, background: `${item.color}10`, border: `1px solid ${item.color}22` }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${item.color}18`, border: `2px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, zIndex: 1 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: item.color }}>{item.step}</div>
                <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 教师视角：预警 + 互助配对 */}
        {view === 'teacher' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
            {/* 预警学生 */}
            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>教师预警名单</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#ef444414', color: '#ef4444', fontWeight: 600 }}>{classStats.alertStudents.length} 人需关注</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {classStats.alertStudents.map(st => (
                  <div key={st.id} style={{ padding: '8px 10px', borderRadius: 8, background: `${scoreColor(st.score.total)}0e`, border: `1px solid ${scoreColor(st.score.total)}20` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>{st.name}</span>
                      <ScoreBadge score={st.score.total} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 3 }}>
                      {st.feedback.alerts[0] || `${st.style}，建议重点关注`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* 互助配对 */}
            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>🤝</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>智能互助配对建议</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {classStats.pairings.map((pair, pi) => {
                  const col = dimColor(pair.dim);
                  return (
                    <div key={pi} style={{ padding: '8px 10px', borderRadius: 8, background: `${col}0c`, border: `1px solid ${col}20`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ textAlign: 'center', minWidth: 40 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: col }}>{pair.mentor.name}</div>
                        <div style={{ fontSize: 9, color: '#9ca3af' }}>引导者</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: col, fontWeight: 600 }}>→ {pair.label}</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 40 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{pair.mentee.name}</div>
                        <div style={{ fontSize: 9, color: '#9ca3af' }}>学习者</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ══ Step 4：迭代优化 ════════════════════════════════════════════════════
  const StepOptimize = () => {
    const displayStudent = selected || null;

    // 成长曲线数据
    const growthLines = displayStudent
      ? EVAL_DIM_KEYS.map((key, ki) => ({
          data: displayStudent.weekly.map(w => w.dims[key]),
          color: EVAL_DIM_COLORS[ki],
          name: EVAL_DIM_LABELS[ki],
        }))
      : [{ data: classStats.weeklyClass.map(w => w.mean), color: ACCENT, name: '全班均值' }];

    const yMin = Math.floor(Math.min(...growthLines.flatMap(l => l.data)) - 0.5);
    const yMax = Math.ceil(Math.max(...growthLines.flatMap(l => l.data)) + 0.5);

    // 薄弱维度统计（班级）
    const weakDimKey = EVAL_DIM_KEYS.reduce((weak, key) =>
      classStats.avgDims[key] < classStats.avgDims[weak] ? key : weak, EVAL_DIM_KEYS[0]);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 成长轨迹 */}
        <div style={{ ...CARD, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
              {displayStudent ? `${displayStudent.name} 六维成长轨迹（6周）` : '全班均值成长曲线（6周）'}
            </div>
            {displayStudent && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EVAL_DIM_KEYS.map((k, ki) => (
                  <span key={k} style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 10, height: 3, background: EVAL_DIM_COLORS[ki], borderRadius: 99, display: 'inline-block' }} />
                    {EVAL_DIM_LABELS[ki]}
                  </span>
                ))}
              </div>
            )}
          </div>
          <GrowthLine lines={growthLines} labels={WEEK_LABELS} yMin={Math.max(0, yMin)} yMax={Math.min(10, yMax)} W={600} H={150} />
          {displayStudent && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(92px,1fr))', gap: 6, marginTop: 12 }}>
              {EVAL_DIM_KEYS.map((key, ki) => {
                const w1 = displayStudent.weekly[0].dims[key];
                const w6 = displayStudent.weekly[WEEKS - 1].dims[key];
                const delta = w6 - w1;
                return (
                  <div key={key} style={{ padding: '6px 8px', borderRadius: 8, background: `${EVAL_DIM_COLORS[ki]}0c`, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: EVAL_DIM_COLORS[ki], fontWeight: 600 }}>{EVAL_DIM_LABELS[ki]}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: delta >= 0 ? '#10a37f' : '#ef4444', marginTop: 2 }}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 9, color: '#9ca3af' }}>{w1.toFixed(1)} → {w6.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 全班各维度热力演变 + 分组建议 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
          {/* 班级维度热力演变 */}
          <div style={{ ...CARD, padding: '16px 18px', overflowX: 'auto' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>班级六维能力演变热力图</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 6px', color: '#9ca3af', fontWeight: 600 }}>维度</th>
                  {WEEK_LABELS.map(lb => <th key={lb} style={{ textAlign: 'center', padding: '4px 6px', color: '#9ca3af', fontWeight: 600, fontSize: 10 }}>{lb}</th>)}
                  <th style={{ textAlign: 'center', padding: '4px 6px', color: '#9ca3af', fontWeight: 600 }}>趋势</th>
                </tr>
              </thead>
              <tbody>
                {EVAL_DIM_KEYS.map((key, ki) => {
                  const col = EVAL_DIM_COLORS[ki];
                  const weekVals = classStats.weeklyClass.map(w => w.dims[key]);
                  const trend = weekVals[WEEKS - 1] - weekVals[0];
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                      <td style={{ padding: '5px 6px', fontSize: 11, color: col, fontWeight: 600 }}>{EVAL_DIM_LABELS[ki]}</td>
                      {weekVals.map((v, wi) => {
                        const intensity = 0.08 + (v / 10) * 0.72;
                        return (
                          <td key={wi} style={{ padding: '5px 6px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', width: 32, padding: '2px 0', borderRadius: 4, background: col, opacity: intensity, color: '#fff', fontWeight: 700, fontSize: 10 }}>
                              {v.toFixed(1)}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, color: trend >= 0 ? '#10a37f' : '#ef4444', fontSize: 12 }}>
                        {trend >= 0 ? '↑' : '↓'}{Math.abs(trend).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 下轮教学建议 + 分组调整 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...CARD, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>🎯 下轮教学重点建议</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { label: `强化 ${EVAL_DIM_LABELS[EVAL_DIM_KEYS.indexOf(weakDimKey)]}`, desc: '班级最薄弱维度，建议专题补强', color: '#ef4444' },
                  { label: '激活 E 型学生参与', desc: '低参与组需低门槛任务先行激活', color: '#8b5cf6' },
                  { label: '深化五阶第4-5阶', desc: '分析批判 & 创新迁移普遍偏低', color: '#f59e0b' },
                  { label: '推进师范情境转化', desc: '教学转化力需专项练习支撑', color: '#ec4899' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...CARD, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>🔄 分组动态调整建议</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {classStats.alertStudents.slice(0, 4).map(st => (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: 'rgba(0,0,0,.03)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', minWidth: 36 }}>{st.name}</span>
                    <span style={{ flex: 1, fontSize: 10, color: '#6b7280' }}>建议与 A 型强者重新配对</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${ACCENT}14`, color: ACCENT, fontWeight: 600 }}>待调整</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 评价-教学-提升 闭环 */}
        <div style={{ ...CARD, padding: '16px 20px', background: 'linear-gradient(135deg,rgba(16,163,127,.06),rgba(99,102,241,.06))' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12, textAlign: 'center' }}>
            "评价 → 教学 → 提升" 良性循环闭环
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            {[
              { icon: '📊', title: '动态评价', desc: '实时采集画像数据', color: '#10a37f' },
              { icon: '📚', title: '精准教学', desc: '针对薄弱维度调整策略', color: '#6366f1' },
              { icon: '🚀', title: '能力提升', desc: '可见成长轨迹驱动动力', color: '#f59e0b' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 14px', borderRadius: 14, background: `${item.color}12`, border: `1px solid ${item.color}30` }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.title}</span>
                <span style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', maxWidth: 100 }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── 渲染 ────────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0: return <StepCollection />;
      case 1: return <StepPortrait />;
      case 2: return <StepScoring />;
      case 3: return <StepFeedback />;
      case 4: return <StepOptimize />;
      default: return null;
    }
  };

  return (
    <div className="tool-workspace evaluation-page">
      <div className="tool-workspace-shell">
      <Header />
      <PipelineNav />
      {renderStep()}
      </div>

      <DataManagementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataChanged={(newList) => {
          setCurrentStudents(newList);
          setSelectedId(null);
        }}
      />
    </div>
  );
}
