import { useMemo, useState } from 'react';
import { KP_LABELS, KP_COLORS, ERROR_TYPES, ERROR_COLORS } from '../../data/groupingData';

/** 得分 0–10 → 颜色（红→黄→绿） */
function scoreToColor(s) {
  if (s >= 8) return `hsl(${158 + (s - 8) * 10}, 65%, 48%)`;
  if (s >= 6) return `hsl(${30 + (s - 6) * 64}, 82%, 52%)`;
  return `hsl(${(s / 6) * 15}, 78%, ${44 + (1 - s / 6) * 6}%)`;
}

/** 桑基左侧分组色条（颜色与分组一致） */
const GROUP_STRIPE_COLORS = ['#10a37f', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

export function HeatmapChart({ students, selectedId, hoveredId, studentGroupMap, groupColors, onSelect, onHover }) {
  const [sortKP, setSortKP] = useState(null);   // null | 0|1|2|3
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    if (sortKP === null) return students;
    return [...students].sort((a, b) =>
      sortDir === 'desc' ? b.scores[sortKP] - a.scores[sortKP] : a.scores[sortKP] - b.scores[sortKP]
    );
  }, [students, sortKP, sortDir]);

  const ROW_H = 22;
  const COL_W = 72;
  const LABEL_W = 68;
  const HEADER_H = 52;
  const STRIPE_W = 5;
  const svgW = STRIPE_W + LABEL_W + 4 * COL_W + 2;
  const svgH = HEADER_H + sorted.length * ROW_H + 4;

  function toggleSort(k) {
    if (sortKP === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKP(k); setSortDir('desc'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>学生 × 知识点能力热力图</span>
        {sortKP !== null && (
          <button
            onClick={() => setSortKP(null)}
            style={{ fontSize: 11, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}
          >重置排序</button>
        )}
      </div>
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* 列标题 */}
        {KP_LABELS.map((label, k) => (
          <g key={k} onClick={() => toggleSort(k)} style={{ cursor: 'pointer' }}>
            <rect
              x={STRIPE_W + LABEL_W + k * COL_W} y={0} width={COL_W - 1} height={HEADER_H}
              fill={sortKP === k ? KP_COLORS[k] + '22' : 'transparent'}
              rx={4}
            />
            {/* 色块指示条 */}
            <rect x={STRIPE_W + LABEL_W + k * COL_W + 4} y={4} width={COL_W - 10} height={4} rx={2} fill={KP_COLORS[k]} opacity={0.8} />
            <text
              x={STRIPE_W + LABEL_W + k * COL_W + COL_W / 2} y={24}
              textAnchor="middle" fontSize={11} fontWeight={600} fill={KP_COLORS[k]}
            >{label}</text>
            <text
              x={STRIPE_W + LABEL_W + k * COL_W + COL_W / 2} y={40}
              textAnchor="middle" fontSize={9} fill="#9ca3af"
            >点击排序 {sortKP === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}</text>
          </g>
        ))}

        {/* 数据行 */}
        {sorted.map((student, row) => {
          const y = HEADER_H + row * ROW_H;
          const isSelected = selectedId === student.id;
          const isHovered = hoveredId === student.id;
          const gColor = groupColors?.[studentGroupMap?.[student.id]] ?? '#e5e7eb';
          return (
            <g
              key={student.id}
              onClick={() => onSelect(student.id)}
              onMouseEnter={() => onHover(student.id)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* 行背景 */}
              <rect
                x={STRIPE_W} y={y} width={svgW - STRIPE_W} height={ROW_H - 1}
                fill={isSelected ? '#f0fdf4' : isHovered ? '#f9fafb' : row % 2 === 0 ? '#fafafa' : 'white'}
                rx={2}
              />
              {/* 分组色条 */}
              <rect x={0} y={y + 2} width={STRIPE_W - 1} height={ROW_H - 5} rx={2} fill={gColor} opacity={0.85} />

              {/* 姓名 */}
              <text
                x={STRIPE_W + LABEL_W - 6} y={y + ROW_H / 2 + 4}
                textAnchor="end" fontSize={11.5}
                fontWeight={isSelected ? 700 : 400}
                fill={isSelected ? '#10a37f' : '#374151'}
              >{student.name}</text>

              {/* 知识点色块 */}
              {student.scores.map((score, k) => {
                const cx = STRIPE_W + LABEL_W + k * COL_W;
                const errIdx = ERROR_TYPES.indexOf(student.errors[k]);
                return (
                  <g key={k}>
                    <rect
                      x={cx + 3} y={y + 2} width={COL_W - 7} height={ROW_H - 5}
                      rx={3} fill={scoreToColor(score)} opacity={0.88}
                    />
                    {/* 得分文字 */}
                    <text x={cx + COL_W / 2} y={y + ROW_H / 2 + 4}
                      textAnchor="middle" fontSize={10} fontWeight={600} fill="white"
                    >{score.toFixed(1)}</text>
                    {/* 错误类型角标 */}
                    {student.errors[k] !== '正确' && (
                      <text
                        x={cx + COL_W - 9} y={y + 10}
                        fontSize={7} fill={ERROR_COLORS[errIdx]} fontWeight={700} opacity={0.9}
                      >{student.errors[k].slice(0, 1)}</text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* 图例 */}
        <g transform={`translate(${STRIPE_W + LABEL_W}, ${HEADER_H + sorted.length * ROW_H + 2})`}>
          {['高分(≥8)', '中分(6-8)', '低分(<6)'].map((label, i) => (
            <g key={i} transform={`translate(${i * 80}, 0)`}>
              <rect width={12} height={8} rx={2}
                fill={i === 0 ? '#10a37f' : i === 1 ? '#f59e0b' : '#ef4444'} opacity={0.85}
              />
              <text x={15} y={8} fontSize={9} fill="#6b7280">{label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
