import { KP_LABELS, TYPE_COLORS } from '../../data/groupingData';

const DIMS = [
  { key: 'kp0', label: '基函数构造', max: 10 },
  { key: 'kp1', label: '分式运算', max: 10 },
  { key: 'kp2', label: '节点验证', max: 10 },
  { key: 'kp3', label: '结构概括', max: 10 },
  { key: 'participation', label: '参与主动性', max: 10 },
  { key: 'collaboration', label: '表达合作', max: 10 },
  { key: 'metacog', label: '元认知', max: 10 },
  { key: 'calm', label: '情绪稳定', max: 10 }
];

function getValue(student, key) {
  if (key.startsWith('kp')) return student.scores[parseInt(key.slice(2))];
  if (key === 'metacog') return { 知道: 9, 模糊: 5.5, 不知道: 2 }[student.meta] ?? 5;
  if (key === 'calm') return (6 - student.anxiety) * 2; // anxiety 1→10, 5→2
  return student[key] ?? 5;
}

const COLORS = ['#10a37f', '#6366f1'];

export function RadarChart({ students, groupColors, studentGroupMap, onClose }) {
  if (!students || students.length === 0) return null;

  const W = 260, H = 260;
  const cx = W / 2, cy = H / 2;
  const R = 90;
  const n = DIMS.length;
  const angle = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;

  function toXY(val, maxVal, i) {
    const r = (val / maxVal) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  }

  // 参考网格
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 200,
      background: 'rgba(255,255,252,0.97)',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      padding: '14px 16px',
      width: W + 40,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      backdropFilter: 'blur(12px)'
    }}>
      {/* 标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {students.map((s, i) => (
            <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i], display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>{s.name}</span>
              <span style={{
                fontSize: 10, color: groupColors?.[studentGroupMap?.[s.id]] ?? '#6b7280',
                border: `1px solid ${groupColors?.[studentGroupMap?.[s.id]] ?? '#e5e7eb'}`,
                borderRadius: 4, padding: '0 4px'
              }}>{studentGroupMap?.[s.id]}</span>
            </span>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', lineHeight: 1 }}
        >×</button>
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', width: '100%', height: 'auto', margin: '0 auto' }}
      >
        {/* 网格蛛网 */}
        {gridLevels.map(level => {
          const pts = DIMS.map((d, i) => {
            const [x, y] = toXY(d.max * level, d.max, i);
            return `${x},${y}`;
          }).join(' ');
          return <polygon key={level} points={pts} fill="none" stroke="#e5e7eb" strokeWidth={0.8} />;
        })}

        {/* 轴线 */}
        {DIMS.map((d, i) => {
          const [x, y] = toXY(d.max, d.max, i);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={0.8} />
              {/* 标签 */}
              {(() => {
                const lx = cx + (R + 14) * Math.cos(angle(i));
                const ly = cy + (R + 14) * Math.sin(angle(i));
                return (
                  <text x={lx} y={ly + 3} textAnchor="middle" fontSize={9} fill="#6b7280">{d.label}</text>
                );
              })()}
            </g>
          );
        })}

        {/* 学生多边形 */}
        {students.map((student, si) => {
          const pts = DIMS.map((d, i) => {
            const val = getValue(student, d.key);
            const [x, y] = toXY(val, d.max, i);
            return `${x},${y}`;
          }).join(' ');
          return (
            <g key={student.id}>
              <polygon points={pts}
                fill={COLORS[si]} fillOpacity={0.12}
                stroke={COLORS[si]} strokeWidth={2} />
              {DIMS.map((d, i) => {
                const val = getValue(student, d.key);
                const [x, y] = toXY(val, d.max, i);
                return <circle key={i} cx={x} cy={y} r={3} fill={COLORS[si]} />;
              })}
            </g>
          );
        })}

        {/* 中心点 */}
        <circle cx={cx} cy={cy} r={2} fill="#d1d5db" />
      </svg>

      {/* 数值摘要 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {students.map((s, si) => (
          <div key={s.id} style={{ fontSize: 10, color: '#6b7280', flex: 1 }}>
            <span style={{ color: COLORS[si], fontWeight: 600 }}>{s.name}</span>
            {' '}|{' '}
            综合{(s.scores.reduce((a, b) => a + b, 0) / 4).toFixed(1)} ·
            参与{s.participation} · 焦虑{s.anxiety} · {s.meta}
          </div>
        ))}
      </div>
    </div>
  );
}
