import { useMemo } from 'react';
import { KP_LABELS, KP_COLORS, ERROR_TYPES, ERROR_COLORS } from '../../data/groupingData';

/**
 * 简化 Sankey 图
 * 左列：知识点 → 中列：错误类型 → 右列：学生水平层（优秀/中等/待支持）
 */

const TIER_LABELS = ['优秀', '中等', '待支持'];
const TIER_COLORS = ['#10a37f', '#6366f1', '#ef4444'];
const TIER_THRESHOLDS = [7.5, 5.5]; // avgScore >= 7.5 → 优秀, >= 5.5 → 中等, else 待支持

function avgScore(s) {
  return s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
}

export function SankeyChart({ students, selectedId, hoveredId, onSelect, onHover }) {
  const W = 340, H = 280;
  const COL_W = 18;
  const COL1_X = 10, COL2_X = 140, COL3_X = 280;

  // 构建流量数据: [kpIdx][errTypeIdx][tierIdx] = count
  const flows = useMemo(() => {
    const f = Array.from({ length: 4 }, () =>
      Array.from({ length: 5 }, () => Array(3).fill(0))
    );
    students.forEach(s => {
      const tier = avgScore(s) >= TIER_THRESHOLDS[0] ? 0 : avgScore(s) >= TIER_THRESHOLDS[1] ? 1 : 2;
      s.errors.forEach((err, k) => {
        const errIdx = ERROR_TYPES.indexOf(err);
        if (errIdx >= 0) f[k][errIdx][tier]++;
      });
    });
    return f;
  }, [students]);

  // 左列节点高度（知识点 × 学生数 = 25 次出现，按比例划分）
  const totalFlowPerKP = students.length; // 每个KP有25条流
  const totalFlow = 4 * students.length;

  const nodeH = H - 40; // 可用高度
  const kpH = nodeH / 4 - 4; // 每个KP节点高度

  // 中列：错误类型节点
  const errFlows = useMemo(() => {
    const f = Array(5).fill(0);
    students.forEach(s => {
      s.errors.forEach(err => {
        const i = ERROR_TYPES.indexOf(err);
        if (i >= 0) f[i]++;
      });
    });
    return f;
  }, [students]);
  const totalErrFlow = errFlows.reduce((a, b) => a + b, 0);

  // 右列：学生水平层
  const tierCounts = useMemo(() => {
    const c = [0, 0, 0];
    students.forEach(s => {
      const tier = avgScore(s) >= TIER_THRESHOLDS[0] ? 0 : avgScore(s) >= TIER_THRESHOLDS[1] ? 1 : 2;
      c[tier] += 4; // 每人贡献4个知识点流量
    });
    return c;
  }, [students]);
  const totalTierFlow = tierCounts.reduce((a, b) => a + b, 0);

  // 计算各节点 y 坐标（从上往下均匀分布）
  function kpY(k) { return 20 + k * (kpH + 4); }
  function errY(e) {
    const scale = nodeH / totalErrFlow;
    let y = 20;
    for (let i = 0; i < e; i++) y += errFlows[i] * scale + 3;
    return y;
  }
  function errH(e) { return Math.max(4, errFlows[e] * nodeH / totalErrFlow); }
  function tierY(t) {
    const scale = nodeH / totalTierFlow;
    let y = 20;
    for (let i = 0; i < t; i++) y += tierCounts[i] * scale + 3;
    return y;
  }
  function tierH(t) { return Math.max(4, tierCounts[t] * nodeH / totalTierFlow); }

  // 生成流线：从KP → 错误类型
  const kpErrLinks = useMemo(() => {
    const links = [];
    // 每个知识点内，按错误类型分流
    let kpOffsets = Array(4).fill(0);
    let errOffsets = Array(5).fill(0);

    for (let k = 0; k < 4; k++) {
      for (let e = 0; e < 5; e++) {
        const count = flows[k][e].reduce((a, b) => a + b, 0);
        if (count === 0) continue;
        const kpScale = kpH / totalFlowPerKP;
        const errScale = errH(e) / errFlows[e];
        const h = count * Math.min(kpScale, errScale);

        links.push({
          x1: COL1_X + COL_W,
          y1: kpY(k) + kpOffsets[k] + h / 2,
          x2: COL2_X,
          y2: errY(e) + errOffsets[e] + h / 2,
          h1: h, h2: count * errH(e) / errFlows[e],
          color: KP_COLORS[k],
          count,
          kpLabel: KP_LABELS[k],
          errLabel: ERROR_TYPES[e]
        });
        kpOffsets[k] += h;
        errOffsets[e] += count * errH(e) / errFlows[e];
      }
    }
    return links;
  }, [flows, kpH, errFlows]);

  // 生成流线：错误类型 → 水平层
  const errTierLinks = useMemo(() => {
    const links = [];
    let errOffsets = Array(5).fill(0);
    let tierOffsets = Array(3).fill(0);

    for (let e = 0; e < 5; e++) {
      for (let t = 0; t < 3; t++) {
        const count = flows.reduce((sum, kpFlows) => sum + kpFlows[e][t], 0);
        if (count === 0) continue;
        const h = count * errH(e) / errFlows[e];
        const th = count * tierH(t) / tierCounts[t];
        links.push({
          x1: COL2_X + COL_W,
          y1: errY(e) + errOffsets[e] + h / 2,
          x2: COL3_X,
          y2: tierY(t) + tierOffsets[t] + th / 2,
          h1: h, h2: th,
          color: ERROR_COLORS[e],
          count,
          errLabel: ERROR_TYPES[e],
          tierLabel: TIER_LABELS[t]
        });
        errOffsets[e] += h;
        tierOffsets[t] += th;
      }
    }
    return links;
  }, [flows, errFlows, tierCounts]);

  function SankeyLink({ x1, y1, x2, y2, h1, h2, color, highlighted }) {
    const mx = (x1 + x2) / 2;
    const path = `M${x1},${y1 - h1 / 2} C${mx},${y1 - h1 / 2} ${mx},${y2 - h2 / 2} ${x2},${y2 - h2 / 2}
      L${x2},${y2 + h2 / 2} C${mx},${y2 + h2 / 2} ${mx},${y1 + h1 / 2} ${x1},${y1 + h1 / 2} Z`;
    return (
      <path d={path} fill={color} opacity={highlighted ? 0.7 : 0.25}
        style={{ transition: 'opacity 0.2s' }} />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
        错误类型桑基图
      </span>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* KP → 错误类型流线 */}
        {kpErrLinks.map((link, i) => (
          <SankeyLink key={i} {...link} highlighted={false} />
        ))}
        {/* 错误类型 → 水平层流线 */}
        {errTierLinks.map((link, i) => (
          <SankeyLink key={i} {...link} highlighted={false} />
        ))}

        {/* 左列：知识点节点 */}
        {KP_LABELS.map((label, k) => (
          <g key={k}>
            <rect x={COL1_X} y={kpY(k)} width={COL_W} height={kpH} rx={3} fill={KP_COLORS[k]} opacity={0.9} />
            <text x={COL1_X - 3} y={kpY(k) + kpH / 2 + 4} textAnchor="end" fontSize={9.5} fill={KP_COLORS[k]} fontWeight={600}>
              {label}
            </text>
          </g>
        ))}

        {/* 中列：错误类型节点 */}
        {ERROR_TYPES.map((err, e) => {
          if (errFlows[e] === 0) return null;
          const y = errY(e), h = errH(e);
          return (
            <g key={e}>
              <rect x={COL2_X} y={y} width={COL_W} height={Math.max(4, h)} rx={3} fill={ERROR_COLORS[e]} opacity={0.85} />
              <text x={COL2_X + COL_W + 4} y={y + Math.max(4, h) / 2 + 4} fontSize={9} fill={ERROR_COLORS[e]} fontWeight={500}>
                {err}
                <tspan fill="#9ca3af" fontSize={8}> ×{errFlows[e]}</tspan>
              </text>
            </g>
          );
        })}

        {/* 右列：水平层节点 */}
        {TIER_LABELS.map((tier, t) => {
          if (tierCounts[t] === 0) return null;
          const y = tierY(t), h = tierH(t);
          return (
            <g key={t}>
              <rect x={COL3_X} y={y} width={COL_W} height={Math.max(4, h)} rx={3} fill={TIER_COLORS[t]} opacity={0.9} />
              <text x={COL3_X + COL_W + 4} y={y + Math.max(4, h) / 2 + 4} fontSize={9.5} fill={TIER_COLORS[t]} fontWeight={600}>
                {tier}
                <tspan fill="#9ca3af" fontSize={8}> {Math.round(tierCounts[t] / 4)}人</tspan>
              </text>
            </g>
          );
        })}

        {/* 列标题 */}
        {[
          { x: COL1_X + COL_W / 2, label: '知识点' },
          { x: COL2_X + COL_W / 2, label: '错误类型' },
          { x: COL3_X + COL_W / 2, label: '水平层' }
        ].map((col, i) => (
          <text key={i} x={col.x} y={12} textAnchor="middle" fontSize={9} fill="#9ca3af">{col.label}</text>
        ))}
      </svg>
    </div>
  );
}
