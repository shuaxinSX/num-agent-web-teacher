import { useRef, useState } from "react";
import "./lagrangeInteractivePage.css";
import {
  ContentPageShell,
  MetricCard,
  PanelCard,
  SectionLead
} from "./interpolationPagePrimitives";

// ── math helpers ──────────────────────────────────────────────────────────────

function linspace(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + (i / (n - 1)) * (b - a));
}

function estimatePCHIP(x, y) {
  const n = x.length,
    h = x.slice(1).map((xi, i) => xi - x[i]),
    d = y.slice(1).map((yi, i) => (yi - y[i]) / h[i]);
  const m = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1],
        w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return m;
}

function finiteDiff(x, y) {
  const n = x.length,
    m = new Array(n).fill(0);
  m[0] = (y[1] - y[0]) / (x[1] - x[0]);
  m[n - 1] = (y[n - 1] - y[n - 2]) / (x[n - 1] - x[n - 2]);
  for (let i = 1; i < n - 1; i++)
    m[i] = (y[i + 1] - y[i - 1]) / (x[i + 1] - x[i - 1]);
  return m;
}

function findSegmentIndex(x, xk) {
  const nextIndex = x.findIndex((xi) => xi > xk);
  if (nextIndex === -1) return x.length - 2;
  return Math.max(0, nextIndex - 1);
}

function evalPCHIP(x, y, dy, xEval) {
  return xEval.map((xk) => {
    const i = findSegmentIndex(x, xk);
    const h = x[i + 1] - x[i],
      t = (xk - x[i]) / h;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1,
      h10 = t ** 3 - 2 * t ** 2 + t,
      h01 = -2 * t ** 3 + 3 * t ** 2,
      h11 = t ** 3 - t ** 2;
    return y[i] * h00 + h * dy[i] * h10 + y[i + 1] * h01 + h * dy[i + 1] * h11;
  });
}

function evalPCHIP_deriv(x, y, dy, xEval) {
  return xEval.map((xk) => {
    const i = findSegmentIndex(x, xk);
    const h = x[i + 1] - x[i],
      t = (xk - x[i]) / h;
    const dh00 = (6 * t ** 2 - 6 * t) / h,
      dh10 = (3 * t ** 2 - 4 * t + 1) / h,
      dh01 = (-6 * t ** 2 + 6 * t) / h,
      dh11 = (3 * t ** 2 - 2 * t) / h;
    return y[i] * dh00 + h * dy[i] * dh10 + y[i + 1] * dh01 + h * dy[i + 1] * dh11;
  });
}

function evalNaturalSpline(x, y, xEval) {
  const n = x.length,
    h = x.slice(1).map((xi, i) => xi - x[i]);
  const M = new Array(n).fill(0);
  const size = n - 2;
  if (size > 0) {
    const a = new Array(size).fill(0),
      b = new Array(size).fill(0),
      c = new Array(size).fill(0),
      rhs = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      const ii = i + 1;
      if (i > 0) a[i] = h[ii - 1];
      b[i] = 2 * (h[ii - 1] + h[ii]);
      if (i < size - 1) c[i] = h[ii];
      rhs[i] =
        6 * ((y[ii + 1] - y[ii]) / h[ii] - (y[ii] - y[ii - 1]) / h[ii - 1]);
    }
    const bp = [...b],
      dp = [...rhs];
    for (let i = 1; i < size; i++) {
      const w = a[i] / bp[i - 1];
      bp[i] -= w * c[i - 1];
      dp[i] -= w * dp[i - 1];
    }
    const sol = new Array(size);
    sol[size - 1] = dp[size - 1] / bp[size - 1];
    for (let i = size - 2; i >= 0; i--)
      sol[i] = (dp[i] - c[i] * sol[i + 1]) / bp[i];
    for (let i = 1; i < n - 1; i++) M[i] = sol[i - 1];
  }
  return xEval.map((xk) => {
    const i = findSegmentIndex(x, xk);
    const hi = h[i],
      t = xk - x[i],
      A = (x[i + 1] - xk) / hi,
      B = t / hi;
    return (
      A * y[i] +
      B * y[i + 1] +
      ((A ** 3 - A) * M[i] + (B ** 3 - B) * M[i + 1]) * (hi ** 2 / 6)
    );
  });
}

function buildHermiteDDTable(xArr, yArr, dyArr) {
  const n = xArr.length,
    n2 = 2 * n,
    z = [],
    f0 = [];
  for (let i = 0; i < n; i++) {
    z.push(xArr[i], xArr[i]);
    f0.push(yArr[i], yArr[i]);
  }
  const dd = Array.from({ length: n2 }, (_, i) => {
    const r = new Array(n2).fill(0);
    r[0] = f0[i];
    return r;
  });
  for (let i = 0; i < n2 - 1; i++)
    dd[i][1] =
      Math.abs(z[i + 1] - z[i]) < 1e-12
        ? dyArr[Math.floor(i / 2)]
        : (dd[i + 1][0] - dd[i][0]) / (z[i + 1] - z[i]);
  for (let k = 2; k < n2; k++)
    for (let i = 0; i < n2 - k; i++)
      dd[i][k] = (dd[i + 1][k - 1] - dd[i][k - 1]) / (z[i + k] - z[i]);
  return { z, dd };
}

function newtonEval(z, coeffs, x0) {
  let p = coeffs[coeffs.length - 1];
  for (let k = coeffs.length - 2; k >= 0; k--) p = p * (x0 - z[k]) + coeffs[k];
  return p;
}

// ── SVG plot primitives (copied from LagrangeInteractivePage) ─────────────────

const PALETTE = [
  "#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#f4a261",
  "#a8dadc", "#6a4c93", "#f77f00", "#06d6a0",
];

function makePlot(w, h, pad = { top: 18, right: 16, bottom: 36, left: 50 }) {
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;
  const tx = (x, xMin, xMax) => pad.left + ((x - xMin) / (xMax - xMin)) * pw;
  const ty = (y, yMin, yMax) =>
    pad.top + ph - ((y - yMin) / (yMax - yMin)) * ph;
  const fx = (sx, xMin, xMax) => xMin + ((sx - pad.left) / pw) * (xMax - xMin);
  const fy = (sy, yMin, yMax) =>
    yMin + ((ph - (sy - pad.top)) / ph) * (yMax - yMin);
  const pts = (xs, ys, xMin, xMax, yMin, yMax) =>
    xs
      .map(
        (x, i) =>
          `${tx(x, xMin, xMax).toFixed(1)},${ty(ys[i], yMin, yMax).toFixed(1)}`
      )
      .join(" ");
  return { w, h, pad, pw, ph, tx, ty, fx, fy, pts };
}

function niceTicks(min, max, count = 5) {
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice =
    [1, 2, 2.5, 5, 10].map((f) => f * mag).find((f) => f >= raw) || raw;
  const start = Math.ceil(min / nice) * nice;
  const ticks = [];
  for (let v = start; v <= max + nice * 0.01; v += nice)
    ticks.push(parseFloat(v.toFixed(10)));
  return ticks;
}

function Axes({ p, xMin, xMax, yMin, yMax, xLabel = "x", yLabel = "y" }) {
  const xTicks = niceTicks(xMin, xMax);
  const yTicks = niceTicks(yMin, yMax);
  const zero = Math.max(
    p.pad.top,
    Math.min(p.pad.top + p.ph, p.ty(0, yMin, yMax))
  );
  return (
    <g fontSize={10} fill="#555">
      {xTicks.map((v) => (
        <g key={v}>
          <line
            x1={p.tx(v, xMin, xMax)} y1={p.pad.top}
            x2={p.tx(v, xMin, xMax)} y2={p.pad.top + p.ph}
            stroke="#eee" strokeWidth={1}
          />
          <text
            x={p.tx(v, xMin, xMax)} y={p.pad.top + p.ph + 13}
            textAnchor="middle"
          >
            {v % 1 === 0 ? v : v.toFixed(1)}
          </text>
        </g>
      ))}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={p.pad.left} y1={p.ty(v, yMin, yMax)}
            x2={p.pad.left + p.pw} y2={p.ty(v, yMin, yMax)}
            stroke="#eee" strokeWidth={1}
          />
          <text
            x={p.pad.left - 4} y={p.ty(v, yMin, yMax) + 4}
            textAnchor="end"
          >
            {Math.abs(v) >= 1000
              ? v.toExponential(1)
              : v % 1 === 0
              ? v
              : v.toFixed(1)}
          </text>
        </g>
      ))}
      <rect
        x={p.pad.left} y={p.pad.top}
        width={p.pw} height={p.ph}
        fill="none" stroke="#ccc" strokeWidth={1}
      />
      <line
        x1={p.pad.left} y1={zero}
        x2={p.pad.left + p.pw} y2={zero}
        stroke="#bbb" strokeWidth={1}
      />
      <text
        x={p.pad.left + p.pw / 2} y={p.h - 2}
        textAnchor="middle" fontSize={11} fill="#444"
      >
        {xLabel}
      </text>
      <text
        x={10} y={p.pad.top + p.ph / 2}
        textAnchor="middle" fontSize={11} fill="#444"
        transform={`rotate(-90,10,${p.pad.top + p.ph / 2})`}
      >
        {yLabel}
      </text>
    </g>
  );
}

function Legend({ items, x, y }) {
  return (
    <g fontSize={11} fill="#333">
      {items.map((item, i) => (
        <g key={i} transform={`translate(${x},${y + i * 16})`}>
          {item.dash ? (
            <line
              x1={0} y1={5} x2={20} y2={5}
              stroke={item.color} strokeWidth={item.width || 2}
              strokeDasharray={item.dash}
            />
          ) : item.rect ? (
            <rect x={6} y={1} width={8} height={8} fill={item.color} />
          ) : (
            <line
              x1={0} y1={5} x2={20} y2={5}
              stroke={item.color} strokeWidth={item.width || 2}
            />
          )}
          <text x={24} y={9}>
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// ── constants ─────────────────────────────────────────────────────────────────

const INIT_X = [0, 1, 2, 3, 4, 5, 6];
const INIT_Y = [0, 1.5, 0.8, 2.1, 1.0, 2.8, 1.2];
const FINE_N = 500;

// ── MainTab ───────────────────────────────────────────────────────────────────

function MainTab({ pts, setPts, dyMode, setDyMode }) {
  const svgRef = useRef(null);
  const [showTangents, setShowTangents] = useState(false);
  const [evalX, setEvalX] = useState("");
  const [evalResult, setEvalResult] = useState(null);
  const [addMode, setAddMode] = useState(false);

  const W = 560, H = 320;
  const p = makePlot(W, H, { top: 18, right: 16, bottom: 36, left: 50 });

  const xArr = pts.map((pt) => pt.x);
  const yArr = pts.map((pt) => pt.y);
  const dyArr =
    dyMode === "pchip" ? estimatePCHIP(xArr, yArr) : finiteDiff(xArr, yArr);

  const xMin = xArr[0] - 0.3,
    xMax = xArr[xArr.length - 1] + 0.3;
  const allY = evalPCHIP(xArr, yArr, dyArr, linspace(xMin, xMax, FINE_N));
  const yPad = 0.5;
  const yMin = Math.min(...allY, ...yArr) - yPad;
  const yMax = Math.max(...allY, ...yArr) + yPad;

  // Build colored segment polylines
  const segmentLines = [];
  for (let seg = 0; seg < xArr.length - 1; seg++) {
    const segXs = linspace(xArr[seg], xArr[seg + 1], 60);
    const segYs = evalPCHIP(xArr, yArr, dyArr, segXs);
    const ptStr = p.pts(segXs, segYs, xMin, xMax, yMin, yMax);
    segmentLines.push(
      <polyline
        key={seg}
        points={ptStr}
        fill="none"
        stroke={PALETTE[seg % PALETTE.length]}
        strokeWidth={2.2}
      />
    );
  }

  // Tangent lines at nodes
  const tangentLines = showTangents
    ? xArr.map((xi, i) => {
        const slope = dyArr[i];
        const dx = Math.min(0.4, (xMax - xMin) * 0.07);
        const x1 = xi - dx, x2 = xi + dx;
        const y1 = yArr[i] - slope * dx, y2 = yArr[i] + slope * dx;
        return (
          <line
            key={i}
            x1={p.tx(x1, xMin, xMax)} y1={p.ty(y1, yMin, yMax)}
            x2={p.tx(x2, xMin, xMax)} y2={p.ty(y2, yMin, yMax)}
            stroke="#888" strokeWidth={1.5} strokeDasharray="4,3"
          />
        );
      })
    : null;

  function handleSvgClick(e) {
    if (!addMode) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const sy = ((e.clientY - rect.top) / rect.height) * H;
    const nx = parseFloat(p.fx(sx, xMin, xMax).toFixed(3));
    const ny = parseFloat(p.fy(sy, yMin, yMax).toFixed(3));
    if (nx < xMin || nx > xMax) return;
    const newPts = [...pts, { x: nx, y: ny }].sort((a, b) => a.x - b.x);
    setPts(newPts);
    setAddMode(false);
  }

  function deleteNode(i) {
    if (pts.length <= 3) return;
    setPts(pts.filter((_, j) => j !== i));
  }

  function doEval() {
    const xv = parseFloat(evalX);
    if (isNaN(xv)) { setEvalResult("无效输入"); return; }
    const res = evalPCHIP(xArr, yArr, dyArr, [xv])[0];
    setEvalResult(`H(${xv}) = ${res.toFixed(6)}`);
  }

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="保形导数与分段三次曲线"
        title="切换导数估计方式，直接观察 PCHIP 如何保持形状"
        summary="PCHIP 的重点是分段构造和保形导数估计。主图、控制区、求值和节点表被拆成不同层级，避免所有信息挤在同一块。"
        pills={[
          `节点 ${pts.length}`,
          `分段 ${pts.length - 1}`,
          dyMode === "pchip" ? "PCHIP 保形导数" : "有限差分导数"
        ]}
      />

      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>导数估计与节点控制</h4>
            <p>切换导数估计方式、显示控制切线或进入添加节点模式，都会立即反映到主图上。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
          <span className="lagrange-inline-stat">导数估计方式</span>
          {[
            { key: "pchip", label: "PCHIP保形" },
            { key: "finite", label: "有限差分" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={dyMode === key ? "lp-btn lp-btn-active" : "lp-btn"}
              onClick={() => setDyMode(key)}
            >
              {label}
            </button>
          ))}
          <label className="lagrange-check">
            <input
              type="checkbox"
              checked={showTangents}
              onChange={(e) => setShowTangents(e.target.checked)}
            />
            显示控制切线
          </label>
          <button
            className={addMode ? "lp-btn lp-btn-active" : "lp-btn"}
            onClick={() => setAddMode((v) => !v)}
          >
            {addMode ? "点击SVG添加节点…" : "+ 添加节点"}
          </button>
        </div>
      </section>

      <PanelCard
        title="PCHIP 分段三次 Hermite 曲线"
        summary="每一段用不同颜色绘制，节点可点击删除，添加节点模式下可直接在图上放点。"
        className="lagrange-plot-panel"
      >
      <svg
        ref={svgRef}
        className="lagrange-svg"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ border: "1px solid #ddd", borderRadius: 6, cursor: addMode ? "crosshair" : "default", display: "block" }}
        onClick={handleSvgClick}
      >
        <Axes p={p} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xLabel="x" yLabel="H(x)" />
        {segmentLines}
        {tangentLines}
        {/* data nodes */}
        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={p.tx(pt.x, xMin, xMax)}
            cy={p.ty(pt.y, yMin, yMax)}
            r={5}
            fill={PALETTE[Math.max(0, i - 1) % PALETTE.length]}
            stroke="#fff"
            strokeWidth={1.5}
            style={{ cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); deleteNode(i); }}
          />
        ))}
        {/* color legend for segments */}
        {pts.length <= 8 && (
          <Legend
            items={xArr.slice(0, -1).map((xi, i) => ({
              color: PALETTE[i % PALETTE.length],
              label: `[${xi}, ${xArr[i + 1]}]`,
            }))}
            x={p.pad.left + p.pw - 80}
            y={p.pad.top + 4}
          />
        )}
      </svg>
      </PanelCard>

      <div className="lagrange-kpi-grid">
        <MetricCard label="节点数" value={String(pts.length)} hint="节点越多，局部形状控制越细" />
        <MetricCard label="分段数" value={String(pts.length - 1)} hint="每段都是一段三次 Hermite 曲线" />
        <MetricCard label="每段次数" value="3" hint="PCHIP 是分段三次保形插值" />
      </div>

      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>单点求值</h4>
            <p>把求值输入从图表下方单独收出来，避免和节点表混在一起。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
          <span className="lagrange-inline-stat">计算 H(x)</span>
          <input
            className="lagrange-mini-input"
            type="number"
            value={evalX}
            onChange={(e) => setEvalX(e.target.value)}
            placeholder={`${xArr[0]} ~ ${xArr[xArr.length - 1]}`}
          />
          <button className="lp-btn" onClick={doEval}>计算</button>
          {evalResult && (
            <strong className="lagrange-eval-result">{evalResult}</strong>
          )}
        </div>
      </section>

      <PanelCard
        title="节点与导数估计表"
        summary="表格列出当前节点、函数值和估计导数，删除操作也保留在同一处。"
        className="lagrange-table-card"
      >
      <div className="lagrange-table-wrap">
        <table className="lagrange-data-table">
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={thStyle}>节点 i</th>
              <th style={thStyle}>x_i</th>
              <th style={thStyle}>y_i</th>
              <th style={thStyle}>m_i (dy/dx)</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {pts.map((pt, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={tdStyle}>{i}</td>
                <td style={tdStyle}>{pt.x.toFixed(3)}</td>
                <td style={tdStyle}>{pt.y.toFixed(3)}</td>
                <td style={{ ...tdStyle, color: PALETTE[Math.max(0, i - 1) % PALETTE.length] }}>
                  {dyArr[i].toFixed(4)}
                </td>
                <td style={tdStyle}>
                  <button
                    className="lp-btn"
                    style={{ fontSize: 11, padding: "1px 7px" }}
                    onClick={() => deleteNode(i)}
                    disabled={pts.length <= 3}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </PanelCard>
    </div>
  );
}

const thStyle = {
  border: "1px solid #ddd", padding: "4px 10px", textAlign: "center", fontWeight: 600,
};
const tdStyle = {
  border: "1px solid #eee", padding: "3px 10px", textAlign: "center",
};

// ── BasisTab ──────────────────────────────────────────────────────────────────

function BasisTab() {
  const W = 560, H = 300;
  const p = makePlot(W, H, { top: 18, right: 16, bottom: 36, left: 50 });
  const tArr = linspace(0, 1, 300);
  const h00 = tArr.map((t) => 2 * t ** 3 - 3 * t ** 2 + 1);
  const h10 = tArr.map((t) => t ** 3 - 2 * t ** 2 + t);
  const h01 = tArr.map((t) => -2 * t ** 3 + 3 * t ** 2);
  const h11 = tArr.map((t) => t ** 3 - t ** 2);
  const allY = [...h00, ...h10, ...h01, ...h11];
  const yMin = Math.min(...allY) - 0.1;
  const yMax = Math.max(...allY) + 0.1;

  const basisCurves = [
    { ys: h00, color: "#457b9d", dash: null, label: "H₀₀(t) = 2t³−3t²+1" },
    { ys: h10, color: "#2a9d8f", dash: "5,3", label: "H₁₀(t) = t³−2t²+t" },
    { ys: h01, color: "#e63946", dash: null, label: "H₀₁(t) = −2t³+3t²" },
    { ys: h11, color: "#f4a261", dash: "5,3", label: "H₁₁(t) = t³−t²" },
  ];

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="三次 Hermite 基函数"
        title="先看四个基函数如何分别承担端点值和端点导数"
        summary="把曲线形状、公式和端点条件拆成三块，避免图表、公式和表格堆在同一个无层级区域里。"
        pills={["H00 / H10 / H01 / H11", "端点条件", "分段三次"]}
      />

      <div className="lagrange-focus-grid">
        <PanelCard
          title="四个三次基函数的形状"
          summary="每条曲线只负责一个端点值或导数条件，组合后形成单段 Hermite 三次曲线。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border: "1px solid #ddd", borderRadius: 6, display: "block" }}
          >
            <Axes p={p} xMin={0} xMax={1} yMin={yMin} yMax={yMax} xLabel="t" yLabel="H(t)" />
            {basisCurves.map((c, idx) => (
              <polyline
                key={idx}
                points={p.pts(tArr, c.ys, 0, 1, yMin, yMax)}
                fill="none"
                stroke={c.color}
                strokeWidth={2}
                strokeDasharray={c.dash || ""}
              />
            ))}
            <Legend
              items={basisCurves.map((c) => ({ color: c.color, dash: c.dash, label: c.label }))}
              x={p.pad.left + 8}
              y={p.pad.top + 4}
            />
            {[
              { t: 0, v: 1, c: "#457b9d" }, { t: 1, v: 0, c: "#457b9d" },
              { t: 0, v: 0, c: "#2a9d8f" }, { t: 1, v: 0, c: "#2a9d8f" },
              { t: 0, v: 0, c: "#e63946" }, { t: 1, v: 1, c: "#e63946" },
              { t: 0, v: 0, c: "#f4a261" }, { t: 1, v: 0, c: "#f4a261" },
            ].map((m, i) => (
              <circle
                key={i}
                cx={p.tx(m.t, 0, 1)} cy={p.ty(m.v, yMin, yMax)}
                r={3} fill={m.c} stroke="#fff" strokeWidth={1}
              />
            ))}
          </svg>
        </PanelCard>

        <PanelCard
          title="单段插值公式"
          summary="PCHIP 每个小区间最终都会落到这一段 Hermite 三次表达式。"
          className="lagrange-side-panel"
        >
          <div className="lagrange-note">
            <strong>p(t) = </strong>
            y_i · H₀₀ + h·m_i · H₁₀ + y_{"{i+1}"} · H₀₁ + h·m_{"{i+1}"} · H₁₁
            <br />
            其中 t = (x − x_i) / h，h = x_{"{i+1}"} − x_i，m_i 为节点导数估计值。
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title="端点条件速查表"
        summary="每个基函数在 t=0 和 t=1 的函数值、导数值决定了它负责哪一个约束。"
        className="lagrange-table-card"
      >
        <div className="lagrange-table-wrap">
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
            <thead>
              <tr style={{ background: "#f0f4ff" }}>
                <th style={thStyle}>函数</th>
                <th style={thStyle}>H(0)</th>
                <th style={thStyle}>H(1)</th>
                <th style={thStyle}>H′(0)</th>
                <th style={thStyle}>H′(1)</th>
                <th style={thStyle}>物理意义</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "H₀₀", v0: 1, v1: 0, d0: 0, d1: 0, meaning: "左端值插值" },
                { name: "H₁₀", v0: 0, v1: 0, d0: 1, d1: 0, meaning: "左端导数插值" },
                { name: "H₀₁", v0: 0, v1: 1, d0: 0, d1: 0, meaning: "右端值插值" },
                { name: "H₁₁", v0: 0, v1: 0, d0: 0, d1: 1, meaning: "右端导数插值" },
              ].map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ ...tdStyle, color: basisCurves[i].color, fontWeight: 600 }}>{row.name}</td>
                  <td style={tdStyle}>{row.v0}</td>
                  <td style={tdStyle}>{row.v1}</td>
                  <td style={tdStyle}>{row.d0}</td>
                  <td style={tdStyle}>{row.d1}</td>
                  <td style={tdStyle}>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lagrange-note" style={{ marginTop: 10 }}>
          四个基函数满足“分区一”性质：每个基函数恰好在对应端点处取值/导数为 1，其余端点处为 0，保证插值条件精确满足。
        </div>
      </PanelCard>
    </div>
  );
}

// ── CompareTab ────────────────────────────────────────────────────────────────

function CompareTab({ pts, dyArr }) {
  const W = 560, H = 320;
  const p = makePlot(W, H, { top: 18, right: 16, bottom: 36, left: 50 });

  const xArr = pts.map((pt) => pt.x);
  const yArr = pts.map((pt) => pt.y);
  const xMin = xArr[0] - 0.3, xMax = xArr[xArr.length - 1] + 0.3;
  const xFine = linspace(xMin, xMax, FINE_N);

  const yPCHIP = evalPCHIP(xArr, yArr, dyArr, xFine);
  const ySpline = evalNaturalSpline(xArr, yArr, xFine);

  // Global Hermite using PCHIP derivatives
  const { z, dd } = buildHermiteDDTable(xArr, yArr, dyArr);
  const coeffs = z.map((_, i) => dd[0][i]);
  // Actually rebuild properly: coeffs are dd[0][0], dd[0][1], ... dd[0][2n-1]
  const hermiteCoeffs = dd[0];
  const yHermite = xFine.map((xk) => newtonEval(z, hermiteCoeffs, xk));

  const allY = [...yPCHIP, ...ySpline, ...yArr];
  const yPad = 0.4;
  const yMin = Math.min(...allY) - yPad;
  const yMax = Math.max(...allY) + yPad;

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="保形与光滑度对比"
        title="把 PCHIP、自然样条和全局 Hermite 放在同一张图里比较"
        summary="主图负责曲线形态，对比说明解释方法差异，差异图单独下沉，避免所有信息挤在一块。"
        pills={["PCHIP C1", "自然样条 C2", "全局 Hermite"]}
      />

      <div className="lagrange-plot-grid">
        <PanelCard
          title="三种方法曲线对比"
          summary="PCHIP 强调保形，样条强调光滑，全局 Hermite 用所有重节点条件生成一个整体多项式。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border: "1px solid #ddd", borderRadius: 6, display: "block" }}
          >
            <Axes p={p} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} xLabel="x" yLabel="y" />
            <polyline
              points={p.pts(xFine, ySpline, xMin, xMax, yMin, yMax)}
              fill="none" stroke="#e63946" strokeWidth={2} strokeDasharray="6,3"
            />
            <polyline
              points={p.pts(xFine, yHermite, xMin, xMax, yMin, yMax)}
              fill="none" stroke="#6a4c93" strokeWidth={1.8} strokeDasharray="2,2"
            />
            <polyline
              points={p.pts(xFine, yPCHIP, xMin, xMax, yMin, yMax)}
              fill="none" stroke="#457b9d" strokeWidth={2.5}
            />
            {pts.map((pt, i) => (
              <circle
                key={i}
                cx={p.tx(pt.x, xMin, xMax)} cy={p.ty(pt.y, yMin, yMax)}
                r={5} fill="#222" stroke="#fff" strokeWidth={1.5}
              />
            ))}
            <Legend
              items={[
                { color: "#457b9d", label: "PCHIP (保形)" },
                { color: "#e63946", dash: "6,3", label: "自然三次样条 (C²)" },
                { color: "#6a4c93", dash: "2,2", label: "全局Hermite插值" },
                { color: "#222", rect: true, label: "数据节点" },
              ]}
              x={p.pad.left + 8}
              y={p.pad.top + 4}
            />
          </svg>
        </PanelCard>

        <PanelCard
          title="方法对比说明"
          summary="右侧只放判断标准，不再和主图混排。"
          className="lagrange-side-panel"
        >
          <div className="lagrange-note">
            <strong>PCHIP：</strong>逐段构造，保持单调性与局部极值，C¹ 连续，适合物理/工程数据。
            <br />
            <strong>自然三次样条：</strong>全局求解三对角线性方程组，C² 连续，整体更光滑但可能引入振荡。
            <br />
            <strong>全局 Hermite：</strong>使用重节点差商构造，在所有节点上同时满足函数值和导数值条件。
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title="PCHIP 与自然样条的逐点差异"
        summary="差异图单独占一行，阅读时不用在主图和解释文本之间来回跳。"
      >
        <DiffPlot xFine={xFine} y1={yPCHIP} y2={ySpline} xMin={xMin} xMax={xMax} />
      </PanelCard>
    </div>
  );
}

function DiffPlot({ xFine, y1, y2, xMin, xMax }) {
  const W = 560, H = 140;
  const p = makePlot(W, H, { top: 10, right: 16, bottom: 30, left: 50 });
  const diff = y1.map((v, i) => Math.abs(v - y2[i]));
  const dMax = Math.max(...diff, 1e-10);
  return (
    <svg
      className="lagrange-svg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ border: "1px solid #ddd", borderRadius: 6, display: "block" }}
    >
      <Axes p={p} xMin={xMin} xMax={xMax} yMin={0} yMax={dMax * 1.1} xLabel="x" yLabel="|diff|" />
      <polyline
        points={p.pts(xFine, diff, xMin, xMax, 0, dMax * 1.1)}
        fill="none" stroke="#f4a261" strokeWidth={1.8}
      />
    </svg>
  );
}

// ── DerivTab ──────────────────────────────────────────────────────────────────

function DerivTab({ pts, dyArr }) {
  const xArr = pts.map((pt) => pt.x);
  const yArr = pts.map((pt) => pt.y);
  const xMin = xArr[0] - 0.3, xMax = xArr[xArr.length - 1] + 0.3;
  const xFine = linspace(xMin, xMax, FINE_N);

  const yPCHIP = evalPCHIP(xArr, yArr, dyArr, xFine);
  const yDeriv = evalPCHIP_deriv(xArr, yArr, dyArr, xFine);

  // C1 continuity check at interior nodes
  const eps = 1e-7;
  const c1Check = xArr.slice(1, -1).map((xi, idx) => {
    const i = idx + 1;
    const leftDeriv = evalPCHIP_deriv(xArr, yArr, dyArr, [xi - eps])[0];
    const rightDeriv = evalPCHIP_deriv(xArr, yArr, dyArr, [xi + eps])[0];
    return { xi, left: leftDeriv, right: rightDeriv, diff: Math.abs(rightDeriv - leftDeriv) };
  });

  // Top plot: H(x)
  const W = 560, H1 = 200, H2 = 170;
  const p1 = makePlot(W, H1, { top: 14, right: 16, bottom: 30, left: 50 });
  const p2 = makePlot(W, H2, { top: 14, right: 16, bottom: 30, left: 50 });

  const yPad = 0.4;
  const yMin1 = Math.min(...yPCHIP, ...yArr) - yPad;
  const yMax1 = Math.max(...yPCHIP, ...yArr) + yPad;
  const yMin2 = Math.min(...yDeriv, ...dyArr) - 0.3;
  const yMax2 = Math.max(...yDeriv, ...dyArr) + 0.3;

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="导数连续性检查"
        title="把曲线、导数曲线和 C1 检查表分成清楚的阅读层"
        summary="上方对比 H(x) 与 H′(x)，下方用表格验证内部节点左右导数差，避免图表和结论混在一起。"
        pills={["H(x)", "H′(x)", "C1 连续"]}
      />

      <div className="lagrange-compare-grid">
        <PanelCard
          title="PCHIP 插值曲线 H(x)"
          summary="主曲线保持节点形状，红点表示当前数据节点。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={W}
            height={H1}
            viewBox={`0 0 ${W} ${H1}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border: "1px solid #ddd", borderRadius: 6, display: "block" }}
          >
            <Axes p={p1} xMin={xMin} xMax={xMax} yMin={yMin1} yMax={yMax1} xLabel="x" yLabel="H(x)" />
            <polyline
              points={p1.pts(xFine, yPCHIP, xMin, xMax, yMin1, yMax1)}
              fill="none" stroke="#457b9d" strokeWidth={2.2}
            />
            {pts.map((pt, i) => (
              <circle
                key={i}
                cx={p1.tx(pt.x, xMin, xMax)} cy={p1.ty(pt.y, yMin1, yMax1)}
                r={5} fill="#e63946" stroke="#fff" strokeWidth={1.5}
              />
            ))}
          </svg>
        </PanelCard>

        <PanelCard
          title="导数曲线 H′(x)"
          summary="绿色曲线展示分段三次的一阶导数，三角形是节点处导数估计。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={W}
            height={H2}
            viewBox={`0 0 ${W} ${H2}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border: "1px solid #ddd", borderRadius: 6, display: "block" }}
          >
            <Axes p={p2} xMin={xMin} xMax={xMax} yMin={yMin2} yMax={yMax2} xLabel="x" yLabel="H′(x)" />
            <polyline
              points={p2.pts(xFine, yDeriv, xMin, xMax, yMin2, yMax2)}
              fill="none" stroke="#2a9d8f" strokeWidth={2}
            />
            {xArr.map((xi, i) => {
              const cx = p2.tx(xi, xMin, xMax);
              const cy = p2.ty(dyArr[i], yMin2, yMax2);
              const s = 6;
              return (
                <polygon
                  key={i}
                  points={`${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`}
                  fill="#e9c46a" stroke="#888" strokeWidth={1}
                />
              );
            })}
            <Legend
              items={[
                { color: "#2a9d8f", label: "H′(x) 连续导数曲线" },
                { color: "#e9c46a", rect: true, label: "节点处导数 m_i（三角形）" },
              ]}
              x={p2.pad.left + 8}
              y={p2.pad.top + 4}
            />
          </svg>
        </PanelCard>
      </div>

      <PanelCard
        title="C1 连续性验证"
        summary="内部节点左右两侧导数差接近 0，说明 PCHIP 是一阶连续的分段曲线。"
        className="lagrange-table-card"
      >
        <div className="lagrange-table-wrap">
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
            <thead>
              <tr style={{ background: "#f0fff4" }}>
                <th style={thStyle}>节点 x_i</th>
                <th style={thStyle}>左侧导数 H′(x_i⁻)</th>
                <th style={thStyle}>右侧导数 H′(x_i⁺)</th>
                <th style={thStyle}>差值 |左−右|</th>
                <th style={thStyle}>C¹连续？</th>
              </tr>
            </thead>
            <tbody>
              {c1Check.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={tdStyle}>{row.xi.toFixed(3)}</td>
                  <td style={tdStyle}>{row.left.toFixed(6)}</td>
                  <td style={tdStyle}>{row.right.toFixed(6)}</td>
                  <td style={{ ...tdStyle, color: row.diff < 1e-4 ? "#2a9d8f" : "#e63946" }}>
                    {row.diff.toExponential(2)}
                  </td>
                  <td style={{ ...tdStyle, color: row.diff < 1e-4 ? "#2a9d8f" : "#e63946", fontWeight: 600 }}>
                    {row.diff < 1e-4 ? "✓ 是" : "✗ 否"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lagrange-note" style={{ marginTop: 10 }}>
          注：差值为数值误差（约 10⁻⁶ 量级），验证了 PCHIP 在所有内部节点处具有 C¹ 连续性。
        </div>
      </PanelCard>
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function HermitePCHIPPage() {
  const [tab, setTab] = useState("main");
  const [pts, setPts] = useState(() =>
    INIT_X.map((x, i) => ({ x, y: INIT_Y[i] }))
  );
  const [dyMode, setDyMode] = useState("pchip");

  const xArr = pts.map((p) => p.x);
  const yArr = pts.map((p) => p.y);
  const dyArr =
    dyMode === "pchip" ? estimatePCHIP(xArr, yArr) : finiteDiff(xArr, yArr);

  const tabs = [
    { id: "main", label: "主演示", hint: "节点、分段曲线与导数估计" },
    { id: "basis", label: "Hermite基函数", hint: "四个三次基函数的形状" },
    { id: "compare", label: "方法对比", hint: "PCHIP、样条与全局 Hermite" },
    { id: "deriv", label: "导数分析", hint: "检查 C1 连续性与导数跳变" },
  ];
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];

  return (
    <ContentPageShell
      kicker="内容实验 / 保形 / 分段三次 / 导数连续"
      title="把 PCHIP 的保形插值流程收成一页实验台"
      summary="PCHIP 页现在和其他插值内容页使用同一套结构：主图、基函数、方法对比和导数分析各自承担清楚的阅读任务。"
      metaCards={[
        {
          label: "当前视角",
          value: activeTab.label,
          hint: activeTab.hint
        },
        {
          label: "实验模块",
          value: "4 个选项卡",
          hint: "覆盖主图交互、基函数、方法对比与导数连续性。"
        },
        {
          label: "当前节点",
          value: `${pts.length} 个节点`,
          hint: dyMode === "pchip" ? "当前使用 PCHIP 保形导数估计。" : "当前使用有限差分导数估计。"
        }
      ]}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      ariaLabel="PCHIP 内容切换"
    >
        {tab === "main" && (
          <MainTab
            pts={pts}
            setPts={setPts}
            dyMode={dyMode}
            setDyMode={setDyMode}
          />
        )}
        {tab === "basis" && <BasisTab />}
        {tab === "compare" && <CompareTab pts={pts} dyArr={dyArr} />}
        {tab === "deriv" && <DerivTab pts={pts} dyArr={dyArr} />}
    </ContentPageShell>
  );
}
