import { useMemo } from 'react';
import { TYPE_COLORS } from '../../data/groupingData';

const ROLE_SHAPES = {
  讲解: 'circle',
  计算: 'rect',
  构造: 'triangle',
  验证: 'diamond',
  组织: 'pentagon'
};

const META_FILL = { 知道: '#10a37f', 模糊: '#f59e0b', 不知道: '#ef4444' };

function RoleShape({ shape, cx, cy, r, fill, stroke, strokeWidth }) {
  if (shape === 'circle') {
    return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (shape === 'rect') {
    return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={3} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (shape === 'triangle') {
    const pts = [
      [cx, cy - r * 1.1],
      [cx + r, cy + r * 0.7],
      [cx - r, cy + r * 0.7]
    ].map(p => p.join(',')).join(' ');
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (shape === 'diamond') {
    const pts = [
      [cx, cy - r * 1.1],
      [cx + r, cy],
      [cx, cy + r * 1.1],
      [cx - r, cy]
    ].map(p => p.join(',')).join(' ');
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  // pentagon
  const pts = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 72 - 90) * Math.PI / 180;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)].join(',');
  }).join(' ');
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

export function BubbleChart({ students, selectedId, hoveredId, onSelect, onHover }) {
  const W = 340, H = 260, PAD = { l: 48, r: 16, t: 16, b: 48 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  // X: 综合得分总和 0–40，Y: 完成时间
  const totalScores = students.map(s => ({ id: s.id, total: s.scores.reduce((a, b) => a + b, 0) }));
  const minX = 14, maxX = 38;
  const minY = 12, maxY = 37;

  function toX(total) { return PAD.l + ((total - minX) / (maxX - minX)) * plotW; }
  function toY(time) { return PAD.t + (1 - (time - minY) / (maxY - minY)) * plotH; }

  // 气泡大小随焦虑 1→4px, 5→10px
  function bubbleR(anxiety) { return 4 + (anxiety - 1) * 1.5; }

  const quadrants = [
    { x: PAD.l + plotW * 0.5, y: PAD.t, w: plotW * 0.5, h: plotH * 0.5, label: '谨慎稳健型', color: '#eff6ff' },
    { x: PAD.l, y: PAD.t, w: plotW * 0.5, h: plotH * 0.5, label: '焦虑困难型', color: '#fef2f2' },
    { x: PAD.l, y: PAD.t + plotH * 0.5, w: plotW * 0.5, h: plotH * 0.5, label: '粗糙快进型', color: '#fefce8' },
    { x: PAD.l + plotW * 0.5, y: PAD.t + plotH * 0.5, w: plotW * 0.5, h: plotH * 0.5, label: '高效掌握型', color: '#f0fdf4' }
  ];

  // tooltip data derived from hoveredId (used inline in SVG below)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
        知识表现四象限气泡图
      </span>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* 象限背景 */}
        {quadrants.map((q, i) => (
          <g key={i}>
            <rect x={q.x} y={q.y} width={q.w} height={q.h} fill={q.color} rx={0} />
            <text
              x={q.x + q.w / 2} y={q.y + q.h / 2}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill="#9ca3af" opacity={0.8}
            >{q.label}</text>
          </g>
        ))}

        {/* 轴线 */}
        <line x1={PAD.l} y1={PAD.t + plotH / 2} x2={PAD.l + plotW} y2={PAD.t + plotH / 2} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,3" />
        <line x1={PAD.l + plotW / 2} y1={PAD.t} x2={PAD.l + plotW / 2} y2={PAD.t + plotH} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,3" />

        {/* X轴 */}
        <line x1={PAD.l} y1={PAD.t + plotH} x2={PAD.l + plotW} y2={PAD.t + plotH} stroke="#d1d5db" strokeWidth={1} />
        {[16, 20, 24, 28, 32, 36].map(v => (
          <g key={v}>
            <line x1={toX(v)} y1={PAD.t + plotH} x2={toX(v)} y2={PAD.t + plotH + 4} stroke="#d1d5db" strokeWidth={1} />
            <text x={toX(v)} y={PAD.t + plotH + 13} textAnchor="middle" fontSize={9} fill="#9ca3af">{v}</text>
          </g>
        ))}
        <text x={PAD.l + plotW / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="#6b7280">综合得分</text>

        {/* Y轴 */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + plotH} stroke="#d1d5db" strokeWidth={1} />
        {[15, 20, 25, 30, 35].map(v => (
          <g key={v}>
            <line x1={PAD.l - 4} y1={toY(v)} x2={PAD.l} y2={toY(v)} stroke="#d1d5db" strokeWidth={1} />
            <text x={PAD.l - 7} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="#9ca3af">{v}m</text>
          </g>
        ))}
        <text
          x={12} y={PAD.t + plotH / 2}
          textAnchor="middle" fontSize={10} fill="#6b7280"
          transform={`rotate(-90, 12, ${PAD.t + plotH / 2})`}
        >完成时间</text>

        {/* 气泡 */}
        {students.map(student => {
          const total = student.scores.reduce((a, b) => a + b, 0);
          const cx = toX(total);
          const cy = toY(student.time);
          const r = bubbleR(student.anxiety);
          const shape = ROLE_SHAPES[student.role] || 'circle';
          const isSelected = selectedId === student.id;
          const isHovered = hoveredId === student.id;

          return (
            <g
              key={student.id}
              onClick={() => onSelect(student.id)}
              onMouseEnter={() => onHover(student.id)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* 外圈（元认知颜色） */}
              <RoleShape
                shape={shape} cx={cx} cy={cy} r={r + 3}
                fill={META_FILL[student.meta] + '40'}
                stroke={META_FILL[student.meta]}
                strokeWidth={isSelected || isHovered ? 2 : 1}
              />
              {/* 内圈（类型颜色） */}
              <RoleShape
                shape={shape} cx={cx} cy={cy} r={r}
                fill={TYPE_COLORS[student.type]}
                stroke={isSelected ? '#1f2937' : 'white'}
                strokeWidth={isSelected ? 2 : 1}
              />
              {/* 选中或悬停时显示姓名 */}
              {(isSelected || isHovered) && (
                <text
                  x={cx} y={cy - r - 6}
                  textAnchor="middle" fontSize={10} fontWeight={600} fill="#1f2937"
                  style={{ pointerEvents: 'none' }}
                >{student.name}</text>
              )}
            </g>
          );
        })}

        {/* 悬停详情 */}
        {hoveredId && (() => {
          const s = students.find(st => st.id === hoveredId);
          if (!s) return null;
          const total = s.scores.reduce((a, b) => a + b, 0);
          const tx = Math.min(toX(total) + 10, W - 100);
          const ty = Math.max(toY(s.time) - 60, PAD.t);
          return (
            <g>
              <rect x={tx} y={ty} width={90} height={54} rx={6} fill="white" stroke="#e5e7eb" strokeWidth={1}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
              <text x={tx + 6} y={ty + 14} fontSize={10} fontWeight={600} fill="#111827">{s.name}</text>
              <text x={tx + 6} y={ty + 26} fontSize={9} fill="#6b7280">综合得分: {total.toFixed(1)}</text>
              <text x={tx + 6} y={ty + 38} fontSize={9} fill="#6b7280">完成时间: {s.time}min</text>
              <text x={tx + 6} y={ty + 50} fontSize={9} fill="#6b7280">焦虑感: {'★'.repeat(s.anxiety)}{'☆'.repeat(5 - s.anxiety)}</text>
            </g>
          );
        })()}
      </svg>

      {/* 图例 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: '#6b7280' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          元认知不清
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          模糊
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10a37f', display: 'inline-block' }} />
          清晰
        </span>
        <span style={{ marginLeft: 'auto', color: '#9ca3af' }}>气泡大 = 焦虑高</span>
      </div>
    </div>
  );
}
