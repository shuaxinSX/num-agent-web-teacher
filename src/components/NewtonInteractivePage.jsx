import { useRef, useState } from "react";
import "./lagrangeInteractivePage.css";
import {
  ContentPageShell,
  MetricCard,
  PanelCard,
  SectionLead
} from "./interpolationPagePrimitives";

// ── math ──────────────────────────────────────────────────────────────────────

function buildDDTable(xArr, yArr) {
  const n = xArr.length;
  const dd = xArr.map((_, i) => {
    const row = new Array(n).fill(0);
    row[0] = yArr[i];
    return row;
  });
  for (let k = 1; k < n; k++)
    for (let i = 0; i < n - k; i++)
      dd[i][k] = (dd[i + 1][k - 1] - dd[i][k - 1]) / (xArr[i + k] - xArr[i]);
  return dd;
}

function newtonEval(xArr, coeffs, x0) {
  // Horner's method for Newton form
  let p = coeffs[coeffs.length - 1];
  for (let k = coeffs.length - 2; k >= 0; k--) p = p * (x0 - xArr[k]) + coeffs[k];
  return p;
}

// Evaluate polynomial using first (step+1) terms: c0 + c1*(x-x0) + c2*(x-x0)(x-x1) + ...
function newtonEvalStep(xArr, coeffs, x0, step) {
  let p = coeffs[0];
  let omega = 1;
  for (let j = 1; j <= step; j++) {
    omega *= (x0 - xArr[j - 1]);
    p += coeffs[j] * omega;
  }
  return p;
}

function linspace(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + (i / (n - 1)) * (b - a));
}

function chebyshevNodes(a, b, n) {
  return Array.from({ length: n }, (_, j) =>
    (b + a) / 2 + ((b - a) / 2) * Math.cos(((2 * j + 1) * Math.PI) / (2 * n))
  );
}

// ── SVG plot primitives ───────────────────────────────────────────────────────

const PALETTE = [
  "#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#a8dadc", "#6a4c93", "#f77f00", "#06d6a0"
];

function makePlot(w, h, pad = { top: 18, right: 16, bottom: 36, left: 50 }) {
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;
  const tx = (x, xMin, xMax) => pad.left + ((x - xMin) / (xMax - xMin)) * pw;
  const ty = (y, yMin, yMax) => pad.top + ph - ((y - yMin) / (yMax - yMin)) * ph;
  const fx = (sx, xMin, xMax) => xMin + ((sx - pad.left) / pw) * (xMax - xMin);
  const fy = (sy, yMin, yMax) => yMin + ((ph - (sy - pad.top)) / ph) * (yMax - yMin);
  const pts = (xs, ys, xMin, xMax, yMin, yMax) =>
    xs.map((x, i) => `${tx(x, xMin, xMax).toFixed(1)},${ty(ys[i], yMin, yMax).toFixed(1)}`).join(" ");
  return { w, h, pad, pw, ph, tx, ty, fx, fy, pts };
}

function niceTicks(min, max, count = 5) {
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = [1, 2, 2.5, 5, 10].map(f => f * mag).find(f => f >= raw) || raw;
  const start = Math.ceil(min / nice) * nice;
  const ticks = [];
  for (let v = start; v <= max + nice * 0.01; v += nice) ticks.push(parseFloat(v.toFixed(10)));
  return ticks;
}

function Axes({ p, xMin, xMax, yMin, yMax, xLabel = "x", yLabel = "y" }) {
  const xTicks = niceTicks(xMin, xMax);
  const yTicks = niceTicks(yMin, yMax);
  const zero = Math.max(p.pad.top, Math.min(p.pad.top + p.ph, p.ty(0, yMin, yMax)));
  return (
    <g fontSize={10} fill="#555">
      {xTicks.map(v => (
        <g key={v}>
          <line x1={p.tx(v, xMin, xMax)} y1={p.pad.top} x2={p.tx(v, xMin, xMax)} y2={p.pad.top + p.ph} stroke="#eee" strokeWidth={1} />
          <text x={p.tx(v, xMin, xMax)} y={p.pad.top + p.ph + 13} textAnchor="middle">{v % 1 === 0 ? v : v.toFixed(1)}</text>
        </g>
      ))}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={p.pad.left} y1={p.ty(v, yMin, yMax)} x2={p.pad.left + p.pw} y2={p.ty(v, yMin, yMax)} stroke="#eee" strokeWidth={1} />
          <text x={p.pad.left - 4} y={p.ty(v, yMin, yMax) + 4} textAnchor="end">{Math.abs(v) >= 1000 ? v.toExponential(1) : v % 1 === 0 ? v : v.toFixed(1)}</text>
        </g>
      ))}
      <rect x={p.pad.left} y={p.pad.top} width={p.pw} height={p.ph} fill="none" stroke="#ccc" strokeWidth={1} />
      <line x1={p.pad.left} y1={zero} x2={p.pad.left + p.pw} y2={zero} stroke="#bbb" strokeWidth={1} />
      <text x={p.pad.left + p.pw / 2} y={p.h - 2} textAnchor="middle" fontSize={11} fill="#444">{xLabel}</text>
      <text x={10} y={p.pad.top + p.ph / 2} textAnchor="middle" fontSize={11} fill="#444"
        transform={`rotate(-90,10,${p.pad.top + p.ph / 2})`}>{yLabel}</text>
    </g>
  );
}

function Legend({ items, x, y }) {
  return (
    <g fontSize={11} fill="#333">
      {items.map((item, i) => (
        <g key={i} transform={`translate(${x},${y + i * 16})`}>
          {item.dash
            ? <line x1={0} y1={5} x2={20} y2={5} stroke={item.color} strokeWidth={item.width || 2} strokeDasharray={item.dash} />
            : item.rect
            ? <rect x={6} y={1} width={8} height={8} fill={item.color} />
            : <line x1={0} y1={5} x2={20} y2={5} stroke={item.color} strokeWidth={item.width || 2} />}
          <text x={24} y={9}>{item.label}</text>
        </g>
      ))}
    </g>
  );
}

// ── constants ─────────────────────────────────────────────────────────────────

const INIT_X = [0, 1, 3, 6, 7, 9, 10];
const INIT_Y = [0, 12.9, 88.3, 30.5, 10.7, 25.6, 76.5];

const lpThS = { padding:"5px 10px", borderBottom:"1px solid #e5e7eb", textAlign:"center", whiteSpace:"nowrap", fontWeight:600 };
const lpTdS = { padding:"3px 8px", textAlign:"center" };
const lpInputS = { width:90, padding:"2px 6px", border:"1px solid #d1d5db", borderRadius:4, fontSize:12, textAlign:"center" };
const FINE_N = 500;
const TEST_F = x => Math.sin(x / 2) + 0.2 * x;
const RUNGE_F = x => 1 / (1 + x * x);
const RUNGE_RANGE = [-5, 5];

// ── Tab 1: Main demo ──────────────────────────────────────────────────────────

function MainTab({ pts, setPts }) {
  const [evalX, setEvalX] = useState("5.0");
  const [evalMark, setEvalMark] = useState(null);
  const [showBasis, setShowBasis] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [delMode, setDelMode] = useState(false);
  const [showError, setShowError] = useState(false);
  const svgRef = useRef(null);

  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);

  const dd = buildDDTable(xArr, yArr);
  const coeffs = dd.map(row => row[0]); // Newton coefficients: f[x0], f[x0,x1], ...

  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);
  const yFine = xFine.map(x => newtonEval(xArr, coeffs, x));

  const yFineSafe = yFine.filter(isFinite);
  const yMin = Math.min(...yFineSafe, ...yArr) - 8;
  const yMax = Math.max(...yFineSafe, ...yArr) + 8;

  const pMain = makePlot(620, 300);
  const pBasis = makePlot(300, 300);

  const testFExact = xFine.map(TEST_F);
  const errAbs = xFine.map((_, i) => Math.abs(yFine[i] - testFExact[i]));
  const maxErr = Math.max(...errAbs.filter(isFinite));
  const maxIdx = errAbs.indexOf(maxErr);
  const rmse = Math.sqrt(errAbs.filter(isFinite).reduce((s, v) => s + v * v, 0) / errAbs.filter(isFinite).length);
  const pEval = makePlot(300, 200);
  const pError = makePlot(300, 200);

  // Newton basis functions omega_k(x) = (x-x0)(x-x1)...(x-x_{k-1}), normalized for display
  const basisCurves = xArr.map((_, k) =>
    xFine.map(x => {
      let omega = 1;
      for (let j = 0; j < k; j++) omega *= (x - xArr[j]);
      return omega;
    })
  );
  // Normalize each basis curve to [-1, 1] range for display
  const basisNorm = basisCurves.map(curve => {
    const absMax = Math.max(...curve.map(Math.abs).filter(isFinite));
    if (absMax < 1e-12) return curve.map(() => 0);
    return curve.map(v => v / absMax);
  });
  const basisYMin = -1.5, basisYMax = 1.5;

  const evalAllY = [...yFine.filter(isFinite), ...testFExact];
  const evalYMin = Math.min(...evalAllY) - 2;
  const evalYMax = Math.max(...evalAllY) + 2;
  const errLogMin = -16;
  const errLogMax = Math.ceil(Math.log10(Math.max(maxErr, 1e-10))) + 1;
  const errLog = errAbs.map(v => Math.log10(Math.max(v, 1e-16)));

  const cursor = addMode ? "crosshair" : delMode ? "pointer" : "default";

  function svgCoords(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (pMain.w / rect.width);
    const sy = (e.clientY - rect.top) * (pMain.h / rect.height);
    return { sx, sy };
  }

  function handleSvgClick(e) {
    if (!addMode && !delMode) return;
    const { sx, sy } = svgCoords(e);
    const cx = pMain.fx(sx, xMin, xMax);
    const cy = pMain.fy(sy, yMin, yMax);
    if (addMode) {
      setPts(prev => [...prev, { x: cx, y: cy }].sort((a, b) => a.x - b.x));
      setAddMode(false);
    } else {
      if (pts.length <= 2) { setDelMode(false); return; }
      let minD = Infinity, minI = 0;
      pts.forEach((p, i) => {
        const d = (pMain.tx(p.x, xMin, xMax) - sx) ** 2 + (pMain.ty(p.y, yMin, yMax) - sy) ** 2;
        if (d < minD) { minD = d; minI = i; }
      });
      setPts(prev => prev.filter((_, i) => i !== minI));
      setDelMode(false);
    }
  }

  function handleEval() {
    const v = parseFloat(evalX);
    if (isNaN(v)) return;
    const yv = newtonEval(xArr, coeffs, v);
    setEvalMark({ x: v, y: yv });
  }

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="节点编辑、均差系数与误差联动"
        title="直接修改节点后，立刻看到牛顿多项式、基函数和差商系数如何变化"
        summary="这页把节点操作、主图、基函数、均差系数和误差曲线放在同一块实验台里。先改节点，再决定是否展开基函数和误差视图。"
        pills={[
          `当前节点数 ${pts.length}`,
          showBasis ? "基函数面板已打开" : "可展开基函数面板",
          showError ? "误差分析已打开" : "可展开误差分析"
        ]}
      />

      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>节点与求值控制</h4>
            <p>把节点编辑、求值和辅助视图切换集中到一行，避免交互入口分散在图表周围。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
          <button className={`lp-btn${addMode ? " lp-btn-active" : ""}`}
            onClick={() => { setAddMode(v => !v); setDelMode(false); }}>
            {addMode ? "⊕ 点击图形添加点…" : "添加点"}
          </button>
          <button className={`lp-btn${delMode ? " lp-btn-active" : ""}`}
            onClick={() => { setDelMode(v => !v); setAddMode(false); }}
            disabled={pts.length <= 2}>
            {delMode ? "✕ 点击要删除的点…" : "删除点"}
          </button>
          <label className="lagrange-check">
            <input type="checkbox" checked={showBasis} onChange={e => setShowBasis(e.target.checked)} />
            显示基函数 ωₖ(x)
          </label>
          <button className="lp-btn" onClick={() => setShowError(v => !v)}>
            {showError ? "隐藏误差分析" : "误差分析"}
          </button>
          <button className="lp-btn" onClick={() => {
            setPts(INIT_X.map((x, i) => ({ x, y: INIT_Y[i] })));
            setEvalMark(null); setAddMode(false); setDelMode(false); setShowError(false);
          }}>重置</button>
          <span className="lagrange-inline-stat">节点数: {pts.length}</span>
          <span className="lagrange-eval-strip">
            在 x =
            <input type="text" value={evalX} onChange={e => setEvalX(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEval()}
              className="lagrange-mini-input" />
            <button className="lp-btn" onClick={handleEval}>计算插值</button>
            {evalMark && (
              <strong className="lagrange-eval-result">
                y = {evalMark.y.toFixed(6)}
              </strong>
            )}
          </span>
        </div>
      </section>

      <div className="lagrange-focus-grid">
        <PanelCard
          title="牛顿差商插值多项式"
          summary="主图集中放插值曲线、节点和求值标记，所有交互围绕这一张图展开。"
          className="lagrange-plot-panel"
        >
          <svg ref={svgRef} width={pMain.w} height={pMain.h} viewBox={`0 0 ${pMain.w} ${pMain.h}`}
            className="lagrange-svg"
            preserveAspectRatio="xMidYMid meet"
            style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor, display: "block" }}
            onClick={handleSvgClick}>
            <Axes p={pMain} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} />
            <polyline points={pMain.pts(xFine, yFine, xMin, xMax, yMin, yMax)} fill="none" stroke="#2563eb" strokeWidth={2.5} />
            {pts.map((pt, i) => (
              <g key={i}>
                <circle cx={pMain.tx(pt.x, xMin, xMax)} cy={pMain.ty(pt.y, yMin, yMax)}
                  r={6} fill="#e63946" stroke="#fff" strokeWidth={1.5} />
                <text x={pMain.tx(pt.x, xMin, xMax) + 8} y={pMain.ty(pt.y, yMin, yMax) - 5}
                  fontSize={9} fill="#555">({pt.x.toFixed(1)}, {pt.y.toFixed(1)})</text>
              </g>
            ))}
            {evalMark && pMain.ty(evalMark.y, yMin, yMax) >= pMain.pad.top &&
              pMain.ty(evalMark.y, yMin, yMax) <= pMain.pad.top + pMain.ph && (
                <g>
                  <circle cx={pMain.tx(evalMark.x, xMin, xMax)} cy={pMain.ty(evalMark.y, yMin, yMax)}
                    r={8} fill="#06d6a0" stroke="#fff" strokeWidth={2} />
                  <line x1={pMain.tx(evalMark.x, xMin, xMax)} y1={pMain.pad.top}
                    x2={pMain.tx(evalMark.x, xMin, xMax)} y2={pMain.pad.top + pMain.ph}
                    stroke="#06d6a0" strokeWidth={1} strokeDasharray="4 3" />
                  <text x={pMain.tx(evalMark.x, xMin, xMax) + 10} y={pMain.pad.top + 16}
                    fontSize={11} fill="#2a9d8f" fontWeight="bold">
                    ({evalMark.x.toFixed(2)}, {evalMark.y.toFixed(4)})
                  </text>
                </g>
              )}
            <Legend items={[
              { color: "#2563eb", label: "插值曲线" },
              { color: "#e63946", label: "数据点", rect: true },
              ...(evalMark ? [{ color: "#06d6a0", label: "求值点", rect: true }] : []),
            ]} x={pMain.pad.left + 8} y={pMain.pad.top + 8} />
          </svg>
        </PanelCard>

        <div className="lagrange-rail">
          {showBasis ? (
            <PanelCard
              title="牛顿基函数 ωₖ(x)"
              summary="基函数被单独放到右侧参考区，避免和主图抢空间。"
              className="lagrange-side-panel"
            >
              <svg width={pBasis.w} height={pBasis.h} viewBox={`0 0 ${pBasis.w} ${pBasis.h}`}
                className="lagrange-svg"
                preserveAspectRatio="xMidYMid meet"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "block" }}>
                <Axes p={pBasis} xMin={xMin} xMax={xMax} yMin={basisYMin} yMax={basisYMax} yLabel="ωₖ(x)" />
                <line x1={pBasis.pad.left} y1={pBasis.ty(0, basisYMin, basisYMax)}
                  x2={pBasis.pad.left + pBasis.pw} y2={pBasis.ty(0, basisYMin, basisYMax)}
                  stroke="#aaa" strokeDasharray="4 2" strokeWidth={1} />
                <line x1={pBasis.pad.left} y1={pBasis.ty(1, basisYMin, basisYMax)}
                  x2={pBasis.pad.left + pBasis.pw} y2={pBasis.ty(1, basisYMin, basisYMax)}
                  stroke="#aaa" strokeDasharray="4 2" strokeWidth={1} />
                {basisNorm.map((ys, k) => (
                  <g key={k}>
                    <polyline points={pBasis.pts(xFine, ys, xMin, xMax, basisYMin, basisYMax)}
                      fill="none" stroke={PALETTE[k % PALETTE.length]} strokeWidth={1.8} />
                    <circle cx={pBasis.tx(xArr[k], xMin, xMax)} cy={pBasis.ty(0, basisYMin, basisYMax)}
                      r={5} fill={PALETTE[k % PALETTE.length]} stroke="#fff" strokeWidth={1.5} />
                    <text x={pBasis.tx(xArr[k], xMin, xMax)} y={pBasis.ty(0, basisYMin, basisYMax) - 8}
                      fontSize={9} textAnchor="middle" fill={PALETTE[k % PALETTE.length]}>ω{k}</text>
                  </g>
                ))}
              </svg>
            </PanelCard>
          ) : (
            <div className="lagrange-note">
              <strong>建议：</strong>先改节点，再打开基函数面板看每个 <code>ωₖ(x)</code> 如何共同生成当前 Newton 多项式。
            </div>
          )}

          <div className="lagrange-kpi-grid">
            <MetricCard label="当前节点数" value={String(pts.length)} hint="节点编辑会同步影响均差表和误差分析" />
            <MetricCard label="当前多项式次数" value={String(pts.length - 1)} hint="Newton 与 Lagrange 对应同一个唯一多项式" />
          </div>
        </div>
      </div>

      <PanelCard
        title="节点坐标编辑"
        summary="节点表格收成独立卡片，方便在图上调形状和在表中精确录入之间切换。"
        className="lagrange-table-card"
      >
        <div className="lagrange-table-wrap">
          <table className="lagrange-data-table">
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                <th style={lpThS}>i</th>
                <th style={lpThS}>x<sub>i</sub></th>
                <th style={lpThS}>y<sub>i</sub></th>
              </tr>
            </thead>
            <tbody>
              {pts.map((pt, i) => (
                <tr key={i} style={{ borderBottom:"1px solid #e5e7eb" }}>
                  <td style={lpTdS}>{i}</td>
                  <td style={lpTdS}>
                    <input type="number" key={`x-${i}-${pt.x}`} defaultValue={pt.x} step="0.1"
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setPts(prev => {
                          const next = [...prev]; next[i] = { ...next[i], x: v };
                          return next.sort((a, b) => a.x - b.x);
                        });
                      }}
                      onKeyDown={e => e.key === "Enter" && e.target.blur()}
                      style={lpInputS}/>
                  </td>
                  <td style={lpTdS}>
                    <input type="number" key={`y-${i}-${pt.y}`} defaultValue={pt.y} step="0.1"
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setPts(prev => { const next=[...prev]; next[i]={...next[i], y:v}; return next; });
                      }}
                      onKeyDown={e => e.key === "Enter" && e.target.blur()}
                      style={lpInputS}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <PanelCard
        title="差商系数摘要"
        summary="这里直接读取首行系数，帮助把图上的变化和均差表中的 Newton 系数对应起来。"
      >
        <div className="lagrange-note">
          <strong>Newton 差商系数：</strong>
          {coeffs.map((c, k) => (
            <span key={k} className="lagrange-coeff-token">
              <span>f[x₀…x{k}] = </span>
              <strong>{Math.abs(c) < 1e-10 ? "0" : c.toFixed(4)}</strong>
            </span>
          ))}
        </div>
      </PanelCard>

      {showError && (
        <PanelCard
          title="误差分析"
          summary="误差区域默认折叠，展开后把函数对比、对数误差和关键统计集中到同一块分析面板。"
        >
          <div className="lagrange-error-row">
            <div className="lagrange-error-panel">
              <div className="lagrange-mini-title">函数与插值对比</div>
              <svg width={pEval.w} height={pEval.h} viewBox={`0 0 ${pEval.w} ${pEval.h}`}
                className="lagrange-svg"
                preserveAspectRatio="xMidYMid meet"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "block" }}>
                <Axes p={pEval} xMin={xMin} xMax={xMax} yMin={evalYMin} yMax={evalYMax} />
                <polyline points={pEval.pts(xFine, testFExact, xMin, xMax, evalYMin, evalYMax)}
                  fill="none" stroke="#e63946" strokeWidth={2} />
                <polyline points={pEval.pts(xFine, yFine, xMin, xMax, evalYMin, evalYMax)}
                  fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3" />
                {pts.map((pt, i) => (
                  <circle key={i} cx={pEval.tx(pt.x, xMin, xMax)} cy={pEval.ty(pt.y, evalYMin, evalYMax)}
                    r={4} fill="#333" stroke="#fff" strokeWidth={1} />
                ))}
                <Legend items={[
                  { color: "#e63946", label: "测试函数" },
                  { color: "#2563eb", label: "牛顿插值", dash: "6 3" },
                  { color: "#333", label: "插值节点", rect: true },
                ]} x={pEval.pad.left + 4} y={pEval.pad.top + 4} />
              </svg>
            </div>
            <div className="lagrange-error-panel">
              <div className="lagrange-mini-title">插值误差（对数尺度）</div>
              <svg width={pError.w} height={pError.h} viewBox={`0 0 ${pError.w} ${pError.h}`}
                className="lagrange-svg"
                preserveAspectRatio="xMidYMid meet"
                style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "block" }}>
                <Axes p={pError} xMin={xMin} xMax={xMax} yMin={errLogMin} yMax={errLogMax} yLabel="log₁₀|误差|" />
                <polyline points={pError.pts(xFine, errLog, xMin, xMax, errLogMin, errLogMax)}
                  fill="none" stroke="#333" strokeWidth={1.8} />
                <circle cx={pError.tx(xFine[maxIdx], xMin, xMax)} cy={pError.ty(errLog[maxIdx], errLogMin, errLogMax)}
                  r={6} fill="#e63946" stroke="#fff" strokeWidth={2} />
                <text x={pError.tx(xFine[maxIdx], xMin, xMax) + 8}
                  y={pError.ty(errLog[maxIdx], errLogMin, errLogMax) - 4}
                  fontSize={9} fill="#e63946">最大: {maxErr.toExponential(2)}</text>
              </svg>
            </div>
          </div>
          <div className="lagrange-kpi-grid" style={{ marginTop: 14 }}>
            <MetricCard label="最大误差" value={maxErr.toExponential(4)} hint="最坏点通常在插值变化更剧烈的区间" tone="is-danger" />
            <MetricCard label="RMSE" value={rmse.toExponential(4)} hint="看整体误差，而不只看峰值" />
            <MetricCard label="当前节点数" value={String(pts.length)} hint="节点数增加不一定单调降低误差" />
          </div>
        </PanelCard>
      )}
    </div>
  );
}

// ── Tab 2: Divided Difference Table ──────────────────────────────────────────

function DDTableTab({ pts }) {
  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const dd = buildDDTable(xArr, yArr);
  const n = xArr.length;

  const thStyle = {
    background: "#2563eb",
    color: "#fff",
    padding: "6px 12px",
    fontWeight: 600,
    fontSize: 12,
    textAlign: "center",
    border: "1px solid #1d4ed8",
    whiteSpace: "nowrap",
  };
  const tdStyle = (highlight, isCoeff) => ({
    padding: "5px 10px",
    fontSize: 12,
    textAlign: "right",
    border: "1px solid #e5e7eb",
    background: highlight
      ? isCoeff
        ? "#dbeafe"
        : "#f0f9ff"
      : "#fff",
    fontWeight: isCoeff ? 700 : 400,
    color: isCoeff ? "#1d4ed8" : "#333",
    fontFamily: "monospace",
  });

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="直接从表格读取 Newton 系数"
        title="把差商表和插值系数放在一起看，结构会更清楚"
        summary="首行高亮的是 Newton 系数，它们会直接进入多项式展开。这个页面专门把表格阅读本身收成一块独立内容。"
        pills={[`当前节点数 ${n}`, "首行即 Newton 系数", "支持横向阅读高阶均差"]}
      />
      <PanelCard
        title="牛顿均差表"
        summary="蓝色高亮行是首行系数，后续列是更高阶均差。"
        className="lagrange-table-card"
      >
      <div className="lagrange-table-wrap">
        <table style={{ borderCollapse: "collapse", minWidth: 120 + n * 110 }}>
          <thead>
            <tr>
              <th style={thStyle}>xᵢ</th>
              <th style={thStyle}>f[xᵢ]</th>
              {Array.from({ length: n - 1 }, (_, k) => (
                <th key={k} style={thStyle}>{k + 1}阶均差</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {xArr.map((xi, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle(false, false), textAlign: "center", background: "#f9fafb" }}>
                  {xi.toFixed(3)}
                </td>
                {Array.from({ length: n - i }, (_, k) => {
                  const isCoeff = i === 0; // first row = Newton coefficients
                  const val = dd[i][k];
                  return (
                    <td key={k} style={tdStyle(isCoeff, isCoeff && k > 0)}>
                      {Math.abs(val) < 1e-12 ? "0" : val.toFixed(6)}
                    </td>
                  );
                })}
                {/* empty cells to fill the row */}
                {Array.from({ length: i }, (_, k) => (
                  <td key={`empty-${k}`} style={{ ...tdStyle(false, false), background: "#fafafa", color: "#ccc" }}>—</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </PanelCard>
      <PanelCard
        title="首行系数摘要"
        summary="把差商表中的首行系数单独抽出，减少从宽表里来回定位。"
      >
        <div className="lagrange-note">
          <strong>均差表对角线值（首行）：</strong>
          {dd[0].slice(0, n).map((c, k) => (
            <span key={k} className="lagrange-coeff-token">
              <span>c{k} =</span>
              <strong>{Math.abs(c) < 1e-12 ? "0" : c.toFixed(6)}</strong>
            </span>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}

// ── Tab 3: Step-by-step construction ─────────────────────────────────────────

function StepTab({ pts }) {
  const n = pts.length;
  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const [step, setStep] = useState(0);

  const dd = buildDDTable(xArr, yArr);
  const coeffs = dd.map(row => row[0]);

  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);
  const p = makePlot(620, 320);

  // Precompute N_k(x) for k = 0..n-1
  const stepCurves = Array.from({ length: n }, (_, k) =>
    xFine.map(x => newtonEvalStep(xArr, coeffs, x, k))
  );

  // current added term (k-th Newton term) for k>=1
  const termCurves = Array.from({ length: n }, (_, k) => {
    if (k === 0) return xFine.map(() => coeffs[0]);
    return xFine.map((x, i) => stepCurves[k][i] - stepCurves[k - 1][i]);
  });

  const allY = [...stepCurves.flat(), ...yArr].filter(isFinite);
  const yMin = Math.min(...allY) - 8;
  const yMax = Math.max(...allY) + 8;

  const clampY = v => Math.max(yMin - 5, Math.min(yMax + 5, v));
  const safeCurve = ys => ys.map(clampY);

  // Step info
  const stepLabel = step === 0 ? "N₀(x) = c₀" : `N${step}(x) = N${step - 1}(x) + c${step}·ω${step}(x)`;
  const cVal = coeffs[step] !== undefined ? coeffs[step].toFixed(6) : "—";

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="从 c₀ 到完整多项式"
        title="逐项把 Newton 差商多项式搭出来，看到每一步新增了什么"
        summary="这页不再只看最终曲线，而是把每次新增的差商项拆出来。虚线是新增项，蓝线是当前累计多项式。"
        pills={[`当前步数 ${step + 1}/${n}`, "适合讲授 Newton 展开", "每一步都对应一个新系数"]}
      />
      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>逐步构建控制</h4>
            <p>用滑块或按钮逐项推进，适合课堂讲解和自学时对照公式展开。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
          <label className="visualizer-slider lagrange-slider">
            <div className="visualizer-control-head">
              <span>步骤</span>
              <strong>N{step}(x)（前 {step + 1} 项）</strong>
            </div>
            <input type="range" min={0} max={n - 1} step={1} value={step}
              onChange={e => setStep(Number(e.target.value))} />
          </label>
          <button className="lp-btn" onClick={() => setStep(0)}>归零</button>
          <button className="lp-btn" onClick={() => setStep(n - 1)}>完整</button>
          <button className="lp-btn" onClick={() => setStep(s => Math.max(0, s - 1))}>◀ 上一步</button>
          <button className="lp-btn" onClick={() => setStep(s => Math.min(n - 1, s + 1))}>下一步 ▶</button>
        </div>
      </section>

      <PanelCard
        title="当前项信息"
        summary="把当前公式、当前系数和当前参与的插值节点放到一起看。"
      >
        <div className="lagrange-note lagrange-formula-strip">
          <span><strong>当前公式：</strong>{stepLabel}</span>
          <span><strong>系数 c{step}：</strong><em>{cVal}</em></span>
          <span><strong>插值节点：</strong>x₀={xArr[0].toFixed(2)}
            {step > 0 && `, …, x${step}=${xArr[step].toFixed(2)}`}
          </span>
        </div>
      </PanelCard>

      <PanelCard
        title="分项贡献与累计结果"
        summary="灰色虚线是之前的多项式，彩色虚线是本步新增项，蓝线是当前累计结果。"
        className="lagrange-plot-panel"
      >
      <svg width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`}
        className="lagrange-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "block" }}>
        <Axes p={p} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} />
        {/* previous partial polynomials faded */}
        {Array.from({ length: step }, (_, k) => (
          <polyline key={k} points={p.pts(xFine, safeCurve(stepCurves[k]), xMin, xMax, yMin, yMax)}
            fill="none" stroke={PALETTE[k % PALETTE.length]} strokeWidth={1}
            strokeDasharray="4 3" opacity={0.3} />
        ))}
        {/* current added term */}
        {step > 0 && (
          <polyline points={p.pts(xFine, safeCurve(termCurves[step]), xMin, xMax, yMin, yMax)}
            fill="none" stroke={PALETTE[step % PALETTE.length]} strokeWidth={2.2} strokeDasharray="6 3" />
        )}
        {/* running partial polynomial */}
        <polyline points={p.pts(xFine, safeCurve(stepCurves[step]), xMin, xMax, yMin, yMax)}
          fill="none" stroke="#2563eb" strokeWidth={2.8} />
        {/* data points — active nodes highlighted */}
        {xArr.map((x, i) => (
          <circle key={i} cx={p.tx(x, xMin, xMax)} cy={p.ty(yArr[i], yMin, yMax)}
            r={6} fill={i <= step ? PALETTE[i % PALETTE.length] : "#aaa"}
            stroke="#fff" strokeWidth={1.5} />
        ))}
        <Legend items={[
          ...(step > 0 ? [{ color: PALETTE[step % PALETTE.length], label: `第 ${step} 项增量 c${step}·ω${step}(x)`, dash: "6 3" }] : []),
          { color: "#2563eb", label: `N${step}(x)（当前多项式）`, width: 2.8 },
        ]} x={p.pad.left + 8} y={p.pad.top + 6} />
      </svg>
      </PanelCard>
      <div className="lagrange-note">
        牛顿插值：Nₙ(x) = c₀ + c₁(x−x₀) + c₂(x−x₀)(x−x₁) + …。每步增加一个差商项（虚线），蓝色实线为当前累计多项式。
      </div>
    </div>
  );
}

// ── Tab 4: Runge phenomenon ───────────────────────────────────────────────────

function RungeTab() {
  const [n, setN] = useState(5);
  const xDense = linspace(RUNGE_RANGE[0], RUNGE_RANGE[1], 800);
  const yExact = xDense.map(RUNGE_F);
  const p = makePlot(620, 300);

  const xEqui = linspace(RUNGE_RANGE[0], RUNGE_RANGE[1], n);
  const yEqui = xEqui.map(RUNGE_F);
  const xCheb = chebyshevNodes(RUNGE_RANGE[0], RUNGE_RANGE[1], n);
  const yCheb = xCheb.map(RUNGE_F);

  const ddEqui = buildDDTable(xEqui, yEqui);
  const coeffsEqui = ddEqui.map(row => row[0]);
  const ddCheb = buildDDTable(xCheb, yCheb);
  const coeffsCheb = ddCheb.map(row => row[0]);

  const yEquiInterp = xDense.map(x => newtonEval(xEqui, coeffsEqui, x));
  const yChebInterp = xDense.map(x => newtonEval(xCheb, coeffsCheb, x));

  const yMin = -1.2, yMax = 2.0;
  const clamp = v => Math.max(yMin, Math.min(yMax, v));

  const equiMaxErr = Math.max(...xDense.map((x, i) => Math.abs(yEquiInterp[i] - yExact[i])).filter(isFinite));
  const chebMaxErr = Math.max(...xDense.map((x, i) => Math.abs(yChebInterp[i] - yExact[i])).filter(isFinite));

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="等距节点 vs 切比雪夫节点"
        title="同一个牛顿形式，在不同节点策略下会出现完全不同的稳定性表现"
        summary="牛顿差商只改变表示形式，不改变多项式本身。真正决定边缘振荡的是节点分布，而不是用 Lagrange 还是 Newton 来写。"
        pills={[`当前节点数 ${n}`, "区间 [−5, 5]", "龙格函数 1/(1+x²)"]}
      />
      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>节点数控制</h4>
            <p>调整同一组函数采样点，比较等距节点和切比雪夫节点在边缘区间的差异。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
          <label className="visualizer-slider lagrange-slider">
            <div className="visualizer-control-head">
              <span>节点数 n</span>
              <strong>{n}</strong>
            </div>
            <input type="range" min={2} max={20} step={1} value={n} title={String(n)}
              onChange={e => setN(Number(e.target.value))} />
          </label>
          <button className="lp-btn" onClick={() => setN(s => Math.max(2, s - 1))}>◀ 减少</button>
          <button className="lp-btn" onClick={() => setN(s => Math.min(20, s + 1))}>增加 ▶</button>
          <button className="lp-btn" onClick={() => setN(5)}>重置</button>
        </div>
      </section>

      <PanelCard
        title="函数与两类插值曲线对比"
        summary="黑线是精确函数，红线是等距节点插值，绿色是切比雪夫节点插值。"
        className="lagrange-plot-panel"
      >
      <svg width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`}
        className="lagrange-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "block" }}>
        <Axes p={p} xMin={RUNGE_RANGE[0]} xMax={RUNGE_RANGE[1]} yMin={yMin} yMax={yMax} />
        <polyline points={p.pts(xDense, yExact, RUNGE_RANGE[0], RUNGE_RANGE[1], yMin, yMax)}
          fill="none" stroke="#222" strokeWidth={2} />
        <polyline points={p.pts(xDense, yEquiInterp.map(clamp), RUNGE_RANGE[0], RUNGE_RANGE[1], yMin, yMax)}
          fill="none" stroke="#e63946" strokeWidth={2} strokeDasharray="7 3" />
        <polyline points={p.pts(xDense, yChebInterp.map(clamp), RUNGE_RANGE[0], RUNGE_RANGE[1], yMin, yMax)}
          fill="none" stroke="#2a9d8f" strokeWidth={2} />
        {xEqui.map((x, i) => (
          <circle key={i} cx={p.tx(x, RUNGE_RANGE[0], RUNGE_RANGE[1])}
            cy={p.ty(yEqui[i], yMin, yMax)} r={4} fill="#e63946" stroke="#fff" strokeWidth={1} />
        ))}
        {xCheb.map((x, i) => (
          <rect key={i}
            x={p.tx(x, RUNGE_RANGE[0], RUNGE_RANGE[1]) - 4}
            y={p.ty(yCheb[i], yMin, yMax) - 4}
            width={8} height={8} fill="#2a9d8f" stroke="#fff" strokeWidth={1} />
        ))}
        <Legend items={[
          { color: "#222", label: "精确函数" },
          { color: "#e63946", label: "等距节点插值", dash: "7 3" },
          { color: "#2a9d8f", label: "切比雪夫节点插值" },
        ]} x={p.pad.left + 8} y={p.pad.top + 6} />
      </svg>
      </PanelCard>
      <div className="lagrange-kpi-grid">
        <MetricCard label="等距节点最大误差" value={equiMaxErr.toExponential(3)} hint="节点越多，端点振荡通常越明显" tone="is-danger" />
        <MetricCard label="切比雪夫节点最大误差" value={chebMaxErr.toExponential(3)} hint="把节点向端点集中后，误差会稳定得多" tone="is-safe" />
      </div>
      <div className="lagrange-note">
        随节点数增加，等距节点在区间边缘产生严重振荡（龙格现象）；切比雪夫节点将节点向端点集中，显著抑制振荡。两种节点下牛顿差商插值与拉格朗日插值结果相同（多项式唯一性）。
      </div>
    </div>
  );
}

// ── Tab 5: Error analysis ─────────────────────────────────────────────────────

function ErrorTab({ pts, setPts }) {
  const [useEqui, setUseEqui] = useState(false);
  const [nEqui, setNEqui] = useState(pts.length);

  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);

  const effX = useEqui ? linspace(xMin, xMax, nEqui) : xArr;
  const effY = useEqui ? effX.map(TEST_F) : yArr;

  const ddEff = buildDDTable(effX, effY);
  const coeffsEff = ddEff.map(row => row[0]);

  const yInterp = xFine.map(x => newtonEval(effX, coeffsEff, x));
  const yExact = xFine.map(TEST_F);
  const errAbs = xFine.map((_, i) => Math.abs(yInterp[i] - yExact[i]));
  const maxErr = Math.max(...errAbs.filter(isFinite));
  const maxIdx = errAbs.indexOf(maxErr);
  const rmse = Math.sqrt(errAbs.filter(isFinite).reduce((s, v) => s + v * v, 0) / errAbs.filter(isFinite).length);

  const allY = [...yInterp.filter(isFinite), ...yExact];
  const yMin = Math.min(...allY) - 2, yMax = Math.max(...allY) + 2;
  const errLogMax = Math.ceil(Math.log10(Math.max(maxErr, 1e-10))) + 1;
  const errLogMin = -16;
  const errLog = errAbs.map(v => Math.log10(Math.max(v, 1e-16)));

  const pFn = makePlot(620, 260);
  const pErr = makePlot(620, 200);

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="误差分布与节点策略"
        title="把函数图和误差图拆开看，更容易解释当前 Newton 插值的偏差来源"
        summary="这页聚焦误差本身。上图看插值曲线在哪些区间开始偏离测试函数，下图直接看对数误差如何变化。"
        pills={[useEqui ? `等距节点 ${nEqui}` : "使用当前主演示节点", "测试函数 sin(x/2)+0.2x", "上图看形状，下图看误差"]}
      />
      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>误差观察控制</h4>
            <p>可以切换到等距采样做对照，也可以回到主演示里的当前节点，直接看误差如何变化。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
        <label className="lagrange-check">
          <input type="checkbox" checked={useEqui} onChange={e => setUseEqui(e.target.checked)} />
          使用等距节点（对测试函数采样）
        </label>
        {useEqui ? (
          <div className="lagrange-toolbar">
            <label className="visualizer-slider lagrange-slider">
              <div className="visualizer-control-head">
                <span>节点数 n</span>
                <strong>{nEqui}</strong>
                {nEqui === pts.length && <span style={{ color: "#2a9d8f", fontSize: 11 }}>（与主演示同步）</span>}
              </div>
              <input type="range" min={2} max={20} step={1} value={nEqui} title={String(nEqui)}
                onChange={e => setNEqui(Number(e.target.value))} />
            </label>
            <button className="lp-btn" onClick={() => setNEqui(pts.length)}
              title="同步到主演示节点数">同步主演示 ({pts.length})</button>
          </div>
        ) : (
          <button className="lp-btn" onClick={() => setPts(INIT_X.map((x, i) => ({ x, y: INIT_Y[i] })))}>
            重置节点
          </button>
        )}
      </div>
      </section>

      <div className="lagrange-compare-grid">
        <PanelCard
          title="函数与插值对比"
          summary="先看宏观拟合形状，再决定是不是需要回到主演示继续调节点。"
          className="lagrange-plot-panel"
        >
        <svg width={pFn.w} height={pFn.h} viewBox={`0 0 ${pFn.w} ${pFn.h}`}
          className="lagrange-svg"
          preserveAspectRatio="xMidYMid meet"
          style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "block" }}>
          <Axes p={pFn} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} />
          <polyline points={pFn.pts(xFine, yExact, xMin, xMax, yMin, yMax)}
            fill="none" stroke="#e63946" strokeWidth={2} />
          <polyline points={pFn.pts(xFine, yInterp, xMin, xMax, yMin, yMax)}
            fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3" />
          {effX.map((x, i) => (
            <circle key={i} cx={pFn.tx(x, xMin, xMax)} cy={pFn.ty(effY[i], yMin, yMax)}
              r={5} fill="#333" stroke="#fff" strokeWidth={1.5} />
          ))}
          <Legend items={[
            { color: "#e63946", label: "测试函数 f(x)" },
            { color: "#2563eb", label: "牛顿差商插值", dash: "6 3" },
            { color: "#333", label: "插值节点", rect: true },
          ]} x={pFn.pad.left + 8} y={pFn.pad.top + 6} />
        </svg>
        </PanelCard>

        <PanelCard
          title="插值误差（对数尺度）"
          summary="下图专门看误差级别，适合判断问题发生在局部还是全区间。"
          className="lagrange-plot-panel"
        >
        <svg width={pErr.w} height={pErr.h} viewBox={`0 0 ${pErr.w} ${pErr.h}`}
          className="lagrange-svg"
          preserveAspectRatio="xMidYMid meet"
          style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", display: "block" }}>
          <Axes p={pErr} xMin={xMin} xMax={xMax} yMin={errLogMin} yMax={errLogMax} yLabel="log₁₀|误差|" />
          <polyline points={pErr.pts(xFine, errLog, xMin, xMax, errLogMin, errLogMax)}
            fill="none" stroke="#333" strokeWidth={1.8} />
          <circle cx={pErr.tx(xFine[maxIdx], xMin, xMax)} cy={pErr.ty(errLog[maxIdx], errLogMin, errLogMax)}
            r={7} fill="#e63946" stroke="#fff" strokeWidth={2} />
          <text x={pErr.tx(xFine[maxIdx], xMin, xMax) + 10} y={pErr.ty(errLog[maxIdx], errLogMin, errLogMax) - 4}
            fontSize={10} fill="#e63946">最大误差: {maxErr.toExponential(3)}</text>
        </svg>
        </PanelCard>
      </div>

      <div className="lagrange-kpi-grid">
        <MetricCard label="最大误差" value={maxErr.toExponential(4)} hint="最坏点标记在误差图上" tone="is-danger" />
        <MetricCard label="RMSE" value={rmse.toExponential(4)} hint="看整体误差，不只看峰值" />
        <MetricCard label="当前节点数" value={String(effX.length)} hint={useEqui ? "当前使用等距采样节点" : "当前使用主演示节点"} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "main", label: "主演示", hint: "编辑节点、求值与误差切换" },
  { id: "ddtab", label: "均差表", hint: "直接读出 Newton 系数" },
  { id: "step", label: "逐步构建", hint: "按项展开差商多项式" },
  { id: "runge", label: "龙格现象", hint: "比较等距与切比雪夫节点" },
  { id: "error", label: "误差分析", hint: "看函数对比与误差分布" }
];

export function NewtonInteractivePage() {
  const [tab, setTab] = useState("main");
  const [pts, setPts] = useState(() => INIT_X.map((x, i) => ({ x, y: INIT_Y[i] })));
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];

  return (
    <ContentPageShell
      kicker="内容实验 / 均差 / 基函数 / 稳定性"
      title="把牛顿差商插值的 5 个核心视角收成一页实验台"
      summary="不再只是把均差表和图放在一起，而是把主演示、均差表、逐步构建、龙格现象和误差分析整理成统一的内容页结构。"
      metaCards={[
        {
          label: "当前视角",
          value: activeTab.label,
          hint: activeTab.hint
        },
        {
          label: "实验模块",
          value: "5 个选项卡",
          hint: "从主图交互一直覆盖到均差表与误差分析。"
        },
        {
          label: "当前节点",
          value: `${pts.length} 个插值点`,
          hint: "主演示中的节点编辑会保留到其他分析页。"
        }
      ]}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      ariaLabel="牛顿差商插值内容切换"
    >
      {tab === "main"  && <MainTab pts={pts} setPts={setPts} />}
      {tab === "ddtab" && <DDTableTab pts={pts} />}
      {tab === "step"  && <StepTab pts={pts} />}
      {tab === "runge" && <RungeTab />}
      {tab === "error" && <ErrorTab pts={pts} setPts={setPts} />}
    </ContentPageShell>
  );
}
