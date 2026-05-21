import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { TYPE_COLORS, ROLE_OPTIONS } from '../../data/groupingData';

const ROLE_SHAPES = {
  讲解: 'circle', 计算: 'rect', 构造: 'triangle', 验证: 'diamond', 组织: 'pentagon'
};

const ANXIETY_STROKE = ['', '#10a37f', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

function scoreToFill(avg) {
  if (avg >= 8) return '#10a37f';
  if (avg >= 7) return '#34d399';
  if (avg >= 6) return '#6366f1';
  if (avg >= 5) return '#f59e0b';
  return '#ef4444';
}

function NodeShape({ shape, cx, cy, r, fill, stroke, strokeWidth, opacity = 1 }) {
  const props = { fill, stroke, strokeWidth, opacity };
  if (shape === 'circle') return <circle cx={cx} cy={cy} r={r} {...props} />;
  if (shape === 'rect') {
    return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={3} {...props} />;
  }
  if (shape === 'triangle') {
    const pts = [[cx, cy - r * 1.2], [cx + r, cy + r * 0.8], [cx - r, cy + r * 0.8]].map(p => p.join(',')).join(' ');
    return <polygon points={pts} {...props} />;
  }
  if (shape === 'diamond') {
    const pts = [[cx, cy - r * 1.2], [cx + r * 0.9, cy], [cx, cy + r * 1.2], [cx - r * 0.9, cy]].map(p => p.join(',')).join(' ');
    return <polygon points={pts} {...props} />;
  }
  // pentagon
  const pts = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 72 - 90) * Math.PI / 180;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)].join(',');
  }).join(' ');
  return <polygon points={pts} {...props} />;
}

/** 同步力导向模拟，返回 {id: {x, y}} */
function runForceSimulation(students, groups, W, H, iters = 400) {
  const n = students.length;
  // 初始：各组的组员围绕均匀分布在圆上的组中心
  const groupAngles = groups.map((_, i) => (i / groups.length) * 2 * Math.PI - Math.PI / 2);
  const groupRadius = Math.min(W, H) * 0.3;
  const cx0 = W / 2, cy0 = H / 2;

  const groupMap = {};
  groups.forEach((g, gi) => g.members.forEach(m => { groupMap[m.id] = gi; }));

  const pos = students.map((s) => {
    const gi = groupMap[s.id] ?? 0;
    const angle = groupAngles[gi];
    const groupCx = cx0 + groupRadius * Math.cos(angle);
    const groupCy = cy0 + groupRadius * Math.sin(angle);
    const memberCount = groups[gi]?.members.length || 1;
    const memberIdx = groups[gi]?.members.findIndex(m => m.id === s.id) ?? 0;
    const innerAngle = (memberIdx / memberCount) * 2 * Math.PI;
    const innerR = 30;
    return {
      id: s.id,
      x: groupCx + innerR * Math.cos(innerAngle) + (Math.random() - 0.5) * 5,
      y: groupCy + innerR * Math.sin(innerAngle) + (Math.random() - 0.5) * 5,
      vx: 0, vy: 0
    };
  });

  const pad = 30;

  for (let iter = 0; iter < iters; iter++) {
    const alpha = Math.pow(0.9, iter / 50); // cooling

    // 节点间排斥
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x || 0.01;
        const dy = pos[j].y - pos[i].y || 0.01;
        const dist2 = dx * dx + dy * dy;
        const dist = Math.sqrt(dist2) + 0.1;
        const strength = 1800 * alpha / dist2;
        pos[i].vx -= strength * dx / dist;
        pos[i].vy -= strength * dy / dist;
        pos[j].vx += strength * dx / dist;
        pos[j].vy += strength * dy / dist;
      }
    }

    // 组内弹簧吸引
    groups.forEach((group, gi) => {
      const members = pos.filter(p => groupMap[p.id] === gi);
      const gcx = members.reduce((s, p) => s + p.x, 0) / members.length;
      const gcy = members.reduce((s, p) => s + p.y, 0) / members.length;

      members.forEach(p => {
        // 向组重心收缩
        p.vx += (gcx - p.x) * 0.04 * alpha;
        p.vy += (gcy - p.y) * 0.04 * alpha;
      });

      // 组重心向理想位置移动
      const targetX = cx0 + groupRadius * Math.cos(groupAngles[gi]);
      const targetY = cy0 + groupRadius * Math.sin(groupAngles[gi]);
      members.forEach(p => {
        p.vx += (targetX - p.x) * 0.008 * alpha;
        p.vy += (targetY - p.y) * 0.008 * alpha;
      });
    });

    // 向画布中心轻微引力
    pos.forEach(p => {
      p.vx += (cx0 - p.x) * 0.002;
      p.vy += (cy0 - p.y) * 0.002;
    });

    // 阻尼 + 更新
    pos.forEach(p => {
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x += p.vx;
      p.y += p.vy;
      p.x = Math.max(pad, Math.min(W - pad, p.x));
      p.y = Math.max(pad, Math.min(H - pad, p.y));
    });
  }

  return pos.reduce((acc, p) => { acc[p.id] = { x: p.x, y: p.y }; return acc; }, {});
}

export function NetworkGraph({ students, groups, edges, studentGroupMap, groupColors,
  selectedId, hoveredId, onSelect, onHover, mode }) {

  const W = 740, H = 340;

  // 力模拟（模式/分组变化时重算）
  const positions = useMemo(
    () => runForceSimulation(students, groups, W, H),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, groups.map(g => g.id + g.members.map(m => m.id).join('')).join('|')]
  );

  // 拖拽
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState({});
  const svgRef = useRef(null);

  const getPos = useCallback((id) => dragPos[id] ?? positions[id] ?? { x: W / 2, y: H / 2 }, [dragPos, positions]);

  function handlePointerDown(e, id) {
    e.stopPropagation();
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
    setDragging({ id, ox: sp.x - getPos(id).x, oy: sp.y - getPos(id).y });
  }

  useEffect(() => {
    if (!dragging) return;
    function move(e) {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
      setDragPos(prev => ({
        ...prev,
        [dragging.id]: { x: Math.max(20, Math.min(W - 20, sp.x - dragging.ox)), y: Math.max(20, Math.min(H - 20, sp.y - dragging.oy)) }
      }));
    }
    function up() { setDragging(null); }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [dragging]);

  // 节点大小：参与主动性
  function nodeR(s) { return 6 + (s.participation - 1) / 9 * 8; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          分组关系网络图
          <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11, marginLeft: 6 }}>
            {mode === 'heterogeneous' ? '异质互补模式' : '同质分层模式'}
          </span>
        </span>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>节点可拖动</span>
      </div>
      <svg
        ref={svgRef}
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', width: '100%', height: 'auto', background: 'rgba(250,250,248,0.6)', borderRadius: 10, border: '1px solid #e5e7eb' }}
      >
        {/* 组标签背景圆 */}
        {groups.map((group) => {
          const members = group.members;
          const memberPositions = members.map(m => getPos(m.id));
          const gcx = memberPositions.reduce((s, p) => s + p.x, 0) / memberPositions.length;
          const gcy = memberPositions.reduce((s, p) => s + p.y, 0) / memberPositions.length;
          const color = groupColors[group.id] ?? '#e5e7eb';
          return (
            <g key={group.id}>
              <circle cx={gcx} cy={gcy} r={48}
                fill={color} opacity={0.07} stroke={color} strokeWidth={1} strokeDasharray="5,3" />
              <text x={gcx} y={gcy - 42} textAnchor="middle" fontSize={10} fill={color} fontWeight={700} opacity={0.8}>
                {group.label}
              </text>
            </g>
          );
        })}

        {/* 边 */}
        {edges.map((edge, i) => {
          const p1 = getPos(edge.source), p2 = getPos(edge.target);
          const color = groupColors[edge.groupId] ?? '#e5e7eb';
          const isHighlighted = edge.source === selectedId || edge.target === selectedId ||
            edge.source === hoveredId || edge.target === hoveredId;
          const w = 1 + edge.weight * 3;
          return (
            <line key={i}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={color} strokeWidth={isHighlighted ? w + 1 : w}
              opacity={isHighlighted ? 0.9 : 0.35}
              style={{ transition: 'opacity 0.2s' }}
            />
          );
        })}

        {/* 节点 */}
        {students.map(student => {
          const { x, y } = getPos(student.id);
          const r = nodeR(student);
          const avg = student.scores.reduce((a, b) => a + b, 0) / 4;
          const shape = ROLE_SHAPES[student.role] || 'circle';
          const gColor = groupColors[studentGroupMap[student.id]] ?? '#6b7280';
          const isSelected = selectedId === student.id;
          const isHovered = hoveredId === student.id;

          return (
            <g key={student.id}
              onPointerDown={(e) => handlePointerDown(e, student.id)}
              onClick={() => onSelect(student.id)}
              onMouseEnter={() => onHover(student.id)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: 'grab' }}
            >
              {/* 焦虑外环 */}
              <circle cx={x} cy={y} r={r + 3}
                fill="none"
                stroke={ANXIETY_STROKE[student.anxiety]}
                strokeWidth={student.anxiety >= 3 ? 2 : 1}
                opacity={0.7}
              />
              {/* 主节点 */}
              <NodeShape
                shape={shape} cx={x} cy={y} r={r}
                fill={scoreToFill(avg)}
                stroke={isSelected ? '#1f2937' : isHovered ? gColor : 'white'}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {/* 选中/悬停标签 */}
              {(isSelected || isHovered) && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={x - 20} y={y - r - 18} width={40} height={14}
                    rx={3} fill="white" stroke={gColor} strokeWidth={1}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                  />
                  <text x={x} y={y - r - 8} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#1f2937">
                    {student.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* 图例 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 10, color: '#6b7280' }}>
        <span>节点大小 = 参与主动性</span>
        <span>外环颜色 = 焦虑感</span>
        <span>节点颜色 = 综合得分</span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {ROLE_OPTIONS.map(r => (
            <span key={r} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10 }}>{r === '讲解' ? '●' : r === '计算' ? '■' : r === '构造' ? '▲' : r === '验证' ? '◆' : '⬠'}</span>
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
