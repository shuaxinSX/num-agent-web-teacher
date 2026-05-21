import { useRef, useState } from "react";
import "./lagrangeInteractivePage.css";
import {
  ContentPageShell,
  MetricCard,
  PanelCard,
  SectionLead
} from "./interpolationPagePrimitives";

// ── math ──────────────────────────────────────────────────────────────────────

function buildHermiteDDTable(xArr, yArr, dyArr) {
  const n = xArr.length, n2 = 2 * n;
  const z = [], f0 = [];
  for (let i = 0; i < n; i++) { z.push(xArr[i], xArr[i]); f0.push(yArr[i], yArr[i]); }
  const dd = Array.from({ length: n2 }, (_, i) => {
    const r = new Array(n2).fill(0);
    r[0] = f0[i];
    return r;
  });
  for (let i = 0; i < n2 - 1; i++) {
    dd[i][1] = Math.abs(z[i + 1] - z[i]) < 1e-12
      ? dyArr[Math.floor(i / 2)]
      : (dd[i + 1][0] - dd[i][0]) / (z[i + 1] - z[i]);
  }
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

function hermiteDerivEval(z, coeffs, x0) {
  const h = 1e-7;
  return (newtonEval(z, coeffs, x0 + h) - newtonEval(z, coeffs, x0 - h)) / (2 * h);
}

function lagrangeInterp(xArr, yArr, x0) {
  let y = 0;
  for (let k = 0; k < xArr.length; k++) {
    let L = 1;
    for (let j = 0; j < xArr.length; j++) if (j !== k) L *= (x0 - xArr[j]) / (xArr[k] - xArr[j]);
    y += yArr[k] * L;
  }
  return y;
}

function linspace(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + (i / (n - 1)) * (b - a));
}

// ── constants ─────────────────────────────────────────────────────────────────

const INIT_X  = [0, 1, 3, 5, 7];
const INIT_Y  = [0, 0.8, 0.14, -0.96, -0.66];
const INIT_DY = [1, 0.3, -0.91, -0.28, 0.73];
const TEST_F  = x => Math.sin(x);
const TEST_DF = x => Math.cos(x);
const FINE_N  = 500;

// ── SVG plot primitives ───────────────────────────────────────────────────────

const PALETTE = [
  "#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#a8dadc","#6a4c93","#f77f00","#06d6a0"
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
          <line x1={p.tx(v,xMin,xMax)} y1={p.pad.top} x2={p.tx(v,xMin,xMax)} y2={p.pad.top+p.ph} stroke="#eee" strokeWidth={1}/>
          <text x={p.tx(v,xMin,xMax)} y={p.pad.top+p.ph+13} textAnchor="middle">{v % 1 === 0 ? v : v.toFixed(1)}</text>
        </g>
      ))}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={p.pad.left} y1={p.ty(v,yMin,yMax)} x2={p.pad.left+p.pw} y2={p.ty(v,yMin,yMax)} stroke="#eee" strokeWidth={1}/>
          <text x={p.pad.left-4} y={p.ty(v,yMin,yMax)+4} textAnchor="end">{Math.abs(v) >= 1000 ? v.toExponential(1) : v % 1 === 0 ? v : v.toFixed(1)}</text>
        </g>
      ))}
      <rect x={p.pad.left} y={p.pad.top} width={p.pw} height={p.ph} fill="none" stroke="#ccc" strokeWidth={1}/>
      <line x1={p.pad.left} y1={zero} x2={p.pad.left+p.pw} y2={zero} stroke="#bbb" strokeWidth={1}/>
      <text x={p.pad.left+p.pw/2} y={p.h-2} textAnchor="middle" fontSize={11} fill="#444">{xLabel}</text>
      <text x={10} y={p.pad.top+p.ph/2} textAnchor="middle" fontSize={11} fill="#444"
        transform={`rotate(-90,10,${p.pad.top+p.ph/2})`}>{yLabel}</text>
    </g>
  );
}

function Legend({ items, x, y }) {
  return (
    <g fontSize={11} fill="#333">
      {items.map((item, i) => (
        <g key={i} transform={`translate(${x},${y + i * 16})`}>
          {item.dash
            ? <line x1={0} y1={5} x2={20} y2={5} stroke={item.color} strokeWidth={item.width||2} strokeDasharray={item.dash}/>
            : item.rect
            ? <rect x={6} y={1} width={8} height={8} fill={item.color}/>
            : item.triangle
            ? <polygon points="10,0 18,10 2,10" fill={item.color}/>
            : <line x1={0} y1={5} x2={20} y2={5} stroke={item.color} strokeWidth={item.width||2}/>}
          <text x={24} y={9}>{item.label}</text>
        </g>
      ))}
    </g>
  );
}

// ── Tab 1: Main demo ──────────────────────────────────────────────────────────

function MainTab({ pts, setPts, dyArr, setDyArr }) {
  const [evalX, setEvalX]       = useState("2.0");
  const [evalMark, setEvalMark] = useState(null);
  const [addMode, setAddMode]   = useState(false);
  const [delMode, setDelMode]   = useState(false);
  const [showTangents, setShowTangents] = useState(false);
  const svgRef = useRef(null);

  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const n = xArr.length;

  const { z, dd } = buildHermiteDDTable(xArr, yArr, dyArr);
  const coeffs = dd[0];
  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);
  const yFine = xFine.map(x => newtonEval(z, coeffs, x));

  const yFineSafe = yFine.filter(isFinite);
  const yMin = Math.min(...yFineSafe, ...yArr) - 0.5;
  const yMax = Math.max(...yFineSafe, ...yArr) + 0.5;

  const pMain = makePlot(620, 320);

  const cursor = addMode ? "crosshair" : delMode ? "pointer" : "default";

  function svgCoords(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (pMain.w / rect.width);
    const sy = (e.clientY - rect.top)  * (pMain.h / rect.height);
    return { sx, sy };
  }

  function handleSvgClick(e) {
    if (!addMode && !delMode) return;
    const { sx, sy } = svgCoords(e);
    const cx = pMain.fx(sx, xMin, xMax);
    const cy = pMain.fy(sy, yMin, yMax);
    if (addMode) {
      const idx = [...xArr, cx].sort((a,b) => a-b).indexOf(cx);
      setPts(prev => [...prev, { x: cx, y: cy }].sort((a, b) => a.x - b.x));
      setDyArr(prev => {
        const sorted = [...prev];
        sorted.splice(idx, 0, 0);
        return sorted;
      });
      setAddMode(false);
    } else {
      if (pts.length <= 2) { setDelMode(false); return; }
      let minD = Infinity, minI = 0;
      pts.forEach((p, i) => {
        const d = (pMain.tx(p.x, xMin, xMax) - sx) ** 2 + (pMain.ty(p.y, yMin, yMax) - sy) ** 2;
        if (d < minD) { minD = d; minI = i; }
      });
      setPts(prev => prev.filter((_, i) => i !== minI));
      setDyArr(prev => prev.filter((_, i) => i !== minI));
      setDelMode(false);
    }
  }

  function handleEval() {
    const v = parseFloat(evalX);
    if (isNaN(v)) return;
    const yv = newtonEval(z, coeffs, v);
    setEvalMark({ x: v, y: yv });
  }

  // tangent line endpoints at each node
  const HALF = 0.4;
  function tangentPts(i) {
    const xi = xArr[i], yi = yArr[i], dyi = dyArr[i];
    const x1 = xi - HALF, y1 = yi - dyi * HALF;
    const x2 = xi + HALF, y2 = yi + dyi * HALF;
    return { x1, y1, x2, y2 };
  }

  const degree = 2 * n - 1;

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="函数值与导数值同时约束"
        title="修改节点和导数条件，直接看到 Hermite 多项式如何贴合曲线"
        summary="经典 Hermite 插值的关键不是更多节点，而是每个节点同时携带函数值和导数值。主图、控制区、系数和表格被拆成清晰的阅读层级。"
        pills={[`节点 ${n}`, `导数条件 ${dyArr.length}`, `多项式次数 ${degree}`]}
      />

      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>节点、导数与求值控制</h4>
            <p>把增删节点、切线显示、重置和求值集中在一个控制区，首屏阅读更稳定。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
          <button className={`lp-btn${addMode?" lp-btn-active":""}`}
            onClick={() => { setAddMode(v=>!v); setDelMode(false); }}>
            {addMode ? "点击图形添加点…" : "添加点"}
          </button>
          <button className={`lp-btn${delMode?" lp-btn-active":""}`}
            onClick={() => { setDelMode(v=>!v); setAddMode(false); }}
            disabled={pts.length <= 2}>
            {delMode ? "点击要删除的点…" : "删除点"}
          </button>
          <label className="lagrange-check">
            <input type="checkbox" checked={showTangents} onChange={e=>setShowTangents(e.target.checked)}/>
            显示导数切线
          </label>
          <button className="lp-btn" onClick={() => {
            setPts(INIT_X.map((x,i)=>({x,y:INIT_Y[i]})));
            setDyArr([...INIT_DY]);
            setEvalMark(null); setAddMode(false); setDelMode(false);
          }}>重置</button>
          <span className="lagrange-inline-stat">n={n} / 2n-1={degree}</span>
          <span className="lagrange-eval-strip">
            在 x =
            <input type="text" value={evalX} onChange={e=>setEvalX(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleEval()}
              className="lagrange-mini-input"/>
            <button className="lp-btn" onClick={handleEval}>计算 H(x)</button>
            {evalMark && (
              <strong className="lagrange-eval-result">
                H({evalMark.x.toFixed(2)}) = {evalMark.y.toFixed(6)}
              </strong>
            )}
          </span>
        </div>
      </section>

      <PanelCard
        title="埃尔米特插值多项式 H(x)"
        summary="主图集中放 Hermite 曲线、节点、导数切线和求值点，所有交互围绕这张图展开。"
        className="lagrange-plot-panel"
      >
        <svg ref={svgRef} width={pMain.w} height={pMain.h} viewBox={`0 0 ${pMain.w} ${pMain.h}`}
          className="lagrange-svg"
          preserveAspectRatio="xMidYMid meet"
          style={{ border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", cursor, display:"block" }}
          onClick={handleSvgClick}>
          <Axes p={pMain} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}/>
          <polyline points={pMain.pts(xFine,yFine,xMin,xMax,yMin,yMax)}
            fill="none" stroke="#2563eb" strokeWidth={2.5}/>

          {/* tangent lines */}
          {showTangents && pts.map((pt, i) => {
            const { x1, y1, x2, y2 } = tangentPts(i);
            return (
              <line key={i}
                x1={pMain.tx(x1,xMin,xMax)} y1={pMain.ty(y1,yMin,yMax)}
                x2={pMain.tx(x2,xMin,xMax)} y2={pMain.ty(y2,yMin,yMax)}
                stroke="#f4a261" strokeWidth={1.8} strokeDasharray="4 2"/>
            );
          })}

          {/* data points */}
          {pts.map((pt, i) => (
            <g key={i}>
              <circle cx={pMain.tx(pt.x,xMin,xMax)} cy={pMain.ty(pt.y,yMin,yMax)}
                r={6} fill="#e63946" stroke="#fff" strokeWidth={1.5}/>
              <text x={pMain.tx(pt.x,xMin,xMax)+8} y={pMain.ty(pt.y,yMin,yMax)-5}
                fontSize={9} fill="#555">({pt.x.toFixed(1)},{pt.y.toFixed(1)})</text>
            </g>
          ))}

          {/* eval mark */}
          {evalMark && pMain.ty(evalMark.y,yMin,yMax)>=pMain.pad.top &&
            pMain.ty(evalMark.y,yMin,yMax)<=pMain.pad.top+pMain.ph && (
            <g>
              <circle cx={pMain.tx(evalMark.x,xMin,xMax)} cy={pMain.ty(evalMark.y,yMin,yMax)}
                r={8} fill="#06d6a0" stroke="#fff" strokeWidth={2}/>
              <line x1={pMain.tx(evalMark.x,xMin,xMax)} y1={pMain.pad.top}
                x2={pMain.tx(evalMark.x,xMin,xMax)} y2={pMain.pad.top+pMain.ph}
                stroke="#06d6a0" strokeWidth={1} strokeDasharray="4 3"/>
              <text x={pMain.tx(evalMark.x,xMin,xMax)+10} y={pMain.pad.top+16}
                fontSize={11} fill="#2a9d8f" fontWeight="bold">
                ({evalMark.x.toFixed(2)}, {evalMark.y.toFixed(4)})
              </text>
            </g>
          )}

          <Legend items={[
            {color:"#2563eb",label:"H(x) 埃尔米特插值"},
            {color:"#e63946",label:"数据点",rect:true},
            ...(showTangents ? [{color:"#f4a261",label:"切线方向",dash:"4 2"}] : []),
            ...(evalMark ? [{color:"#06d6a0",label:"求值点",rect:true}] : []),
          ]} x={pMain.pad.left+8} y={pMain.pad.top+8}/>
        </svg>
      </PanelCard>

      <PanelCard
        title="重节点 Newton 系数摘要"
        summary="这里显示前几项系数，便于把主图变化和重节点均差表联系起来。"
      >
        <div className="lagrange-note">
          <strong>Newton 系数 (dd[0][0..5])：</strong>
          {coeffs.slice(0, 6).map((c, i) => (
            <span key={i} className="lagrange-coeff-token">
              <span>c<sub>{i}</sub>=</span>
              <strong>{isFinite(c) ? c.toFixed(4) : "N/A"}</strong>
            </span>
          ))}
          {coeffs.length > 6 && <span className="lagrange-coeff-token">…</span>}
        </div>
      </PanelCard>

      <PanelCard
        title="节点数据编辑（含导数值）"
        summary="把函数值和导数值放在同一张表里，避免导数条件成为隐藏状态。"
        className="lagrange-table-card"
      >
        <div className="lagrange-table-wrap">
          <table className="lagrange-data-table">
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                <th style={thS}>i</th>
                <th style={thS}>x<sub>i</sub></th>
                <th style={thS}>y<sub>i</sub> = H(x<sub>i</sub>)</th>
                <th style={thS}>y'<sub>i</sub> = H'(x<sub>i</sub>)</th>
              </tr>
            </thead>
            <tbody>
              {pts.map((pt, i) => (
                <tr key={i} style={{ borderBottom:"1px solid #e5e7eb" }}>
                  <td style={tdS}>{i}</td>
                  <td style={tdS}>
                    <input type="number" key={`x-${i}-${pt.x}`} defaultValue={pt.x} step="0.1"
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setPts(prev => {
                          const next = [...prev]; next[i] = {...next[i], x:v};
                          return next.sort((a,b)=>a.x-b.x);
                        });
                      }}
                      onKeyDown={e => e.key === "Enter" && e.target.blur()}
                      style={inputS}/>
                  </td>
                  <td style={tdS}>
                    <input type="number" key={`y-${i}-${pt.y}`} defaultValue={pt.y} step="0.1"
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setPts(prev => { const next=[...prev]; next[i]={...next[i],y:v}; return next; });
                      }}
                      onKeyDown={e => e.key === "Enter" && e.target.blur()}
                      style={inputS}/>
                  </td>
                  <td style={tdS}>
                    <input type="number" key={`dy-${i}-${dyArr[i]}`} defaultValue={dyArr[i] ?? 0} step="0.1"
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setDyArr(prev => { const next=[...prev]; next[i]=v; return next; });
                      }}
                      onKeyDown={e => e.key === "Enter" && e.target.blur()}
                      style={inputS}/>
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

const thS = { padding:"4px 10px", textAlign:"left", fontWeight:600, borderBottom:"2px solid #e5e7eb" };
const tdS = { padding:"3px 10px" };
const inputS = { width:80, padding:"2px 4px", border:"1px solid #d1d5db", borderRadius:4, fontSize:12 };

// ── Tab 2: Derivative visualization ──────────────────────────────────────────

function DerivTab({ pts, dyArr }) {
  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const n = xArr.length;
  const { z, dd } = buildHermiteDDTable(xArr, yArr, dyArr);
  const coeffs = dd[0];

  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);
  const yFine = xFine.map(x => newtonEval(z, coeffs, x));
  const dyFine = xFine.map(x => hermiteDerivEval(z, coeffs, x));

  const yAll = [...yFine.filter(isFinite), ...yArr];
  const yMin = Math.min(...yAll) - 0.5;
  const yMax = Math.max(...yAll) + 0.5;

  const dyAll = [...dyFine.filter(isFinite), ...dyArr];
  const dyMin = Math.min(...dyAll) - 0.3;
  const dyMax = Math.max(...dyAll) + 0.3;

  const HALF = 0.4;
  const pTop = makePlot(620, 260);
  const pBot = makePlot(620, 220);

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="导数条件可视化"
        title="把 H(x)、切线方向和 H′(x) 拆成两张独立图"
        summary="上图看主曲线和节点切线方向，下图看数值导数与指定导数值是否吻合，避免两类信息压在一张图里。"
        pills={[`节点 ${n}`, "H(x)", "H′(x)"]}
      />

      <div className="lagrange-compare-grid">
        <PanelCard
          title="H(x) 与切线方向"
          summary="橙色箭头表示每个节点输入的导数约束方向。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={pTop.w}
            height={pTop.h}
            viewBox={`0 0 ${pTop.w} ${pTop.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", display:"block" }}
          >
            <Axes p={pTop} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax} yLabel="H(x)"/>
            <polyline points={pTop.pts(xFine,yFine,xMin,xMax,yMin,yMax)}
              fill="none" stroke="#2563eb" strokeWidth={2.5}/>
            {pts.map((pt, i) => {
              const dyi = dyArr[i] || 0;
              const len = Math.sqrt(1 + dyi*dyi);
              const dx = HALF / len, dy2 = dyi * HALF / len;
              const ax1 = pt.x - dx, ay1 = pt.y - dy2;
              const ax2 = pt.x + dx, ay2 = pt.y + dy2;
              return (
                <g key={i}>
                  <defs>
                    <marker id={`arr-${i}`} markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="#f4a261"/>
                    </marker>
                  </defs>
                  <line
                    x1={pTop.tx(ax1,xMin,xMax)} y1={pTop.ty(ay1,yMin,yMax)}
                    x2={pTop.tx(ax2,xMin,xMax)} y2={pTop.ty(ay2,yMin,yMax)}
                    stroke="#f4a261" strokeWidth={2}
                    markerEnd={`url(#arr-${i})`}/>
                </g>
              );
            })}
            {pts.map((pt, i) => (
              <circle key={i} cx={pTop.tx(pt.x,xMin,xMax)} cy={pTop.ty(pt.y,yMin,yMax)}
                r={5} fill="#e63946" stroke="#fff" strokeWidth={1.5}/>
            ))}
            <Legend items={[
              {color:"#2563eb",label:"H(x)"},
              {color:"#e63946",label:"插值节点",rect:true},
              {color:"#f4a261",label:"切线方向（导数）"},
            ]} x={pTop.pad.left+8} y={pTop.pad.top+6}/>
          </svg>
        </PanelCard>

        <PanelCard
          title="H′(x) 与指定导数值对比"
          summary="红色三角形为输入导数，蓝线为 H(x) 对应的数值导数。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={pBot.w}
            height={pBot.h}
            viewBox={`0 0 ${pBot.w} ${pBot.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border:"1px solid #e5e7eb", borderRadius:8, background:"#fafafa", display:"block" }}
          >
            <Axes p={pBot} xMin={xMin} xMax={xMax} yMin={dyMin} yMax={dyMax} yLabel="H'(x)"/>
            <polyline points={pBot.pts(xFine,dyFine,xMin,xMax,dyMin,dyMax)}
              fill="none" stroke="#2563eb" strokeWidth={2}/>
            {pts.map((pt, i) => {
              const cx = pBot.tx(pt.x, xMin, xMax);
              const cy = pBot.ty(dyArr[i], dyMin, dyMax);
              return (
                <polygon key={i}
                  points={`${cx},${cy-7} ${cx+6},${cy+5} ${cx-6},${cy+5}`}
                  fill="#e63946" stroke="#fff" strokeWidth={1}/>
              );
            })}
            <Legend items={[
              {color:"#2563eb",label:"H'(x) (数值微分)"},
              {color:"#e63946",label:"指定 f'(xᵢ)",triangle:true},
            ]} x={pBot.pad.left+8} y={pBot.pad.top+6}/>
          </svg>
        </PanelCard>
      </div>

      <PanelCard title="读图结论" summary="导数约束是否生效，可以直接看节点处蓝线与红色三角形是否吻合。">
        <div className="lagrange-note">
          红色三角形为输入的导数约束值，蓝线为 H(x) 对应的数值导数，两者在节点处吻合验证了埃尔米特条件。
        </div>
      </PanelCard>
    </div>
  );
}

// ── Tab 3: Hermite DD Table ───────────────────────────────────────────────────

function HermiteDDTab({ pts, dyArr }) {
  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const { z, dd } = buildHermiteDDTable(xArr, yArr, dyArr);
  const n2 = z.length;
  const maxCols = Math.min(n2, 8); // cap columns for display

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="重节点差商"
        title="把重复节点、导数条件和 Newton 系数放进一张可读表"
        summary="表格负责差商细节，系数提要单独放到下方，避免长表和结论挤在同一行。"
        pills={[`${n2} 个重节点`, `显示 ${maxCols} 阶`, "Newton 系数"]}
      />

      <PanelCard
        title="重节点均差表"
        summary="每个节点 xi 重复两次，f′(xi) 用来填充重合节点的一阶均差；蓝色高亮行为 Newton 系数。"
        className="lagrange-table-card"
      >
        <div className="lagrange-table-wrap">
          <table style={{ borderCollapse:"collapse", fontSize:12, minWidth:400, width:"100%" }}>
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                <th style={thS}>i</th>
                <th style={thS}>z<sub>i</sub></th>
                <th style={thS}>f[z<sub>i</sub>]</th>
                {Array.from({length: maxCols-1}, (_,k) => (
                  <th key={k} style={thS}>Ord {k+1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({length: n2}, (_, i) => {
                const isPair0 = i % 2 === 0;
                const pairColor = Math.floor(i/2) % 2 === 0 ? "#fff8f0" : "#f0f8ff";
                const isFirstRow = i === 0;
                const rowBg = isFirstRow ? "#dbeafe" : pairColor;
                return (
                  <tr key={i} style={{ background: rowBg, borderBottom:"1px solid #e5e7eb" }}>
                    <td style={tdS}>{i}</td>
                    <td style={{...tdS, fontWeight: isPair0 ? 600 : 400}}>
                      {z[i].toFixed(3)}
                      {isPair0 && <span style={{ fontSize:10, color:"#888", marginLeft:3 }}>(重)</span>}
                    </td>
                    <td style={tdS}>{dd[i][0].toFixed(4)}</td>
                    {Array.from({length: maxCols-1}, (_, k) => {
                      const ord = k + 1;
                      const val = i < n2 - ord ? dd[i][ord] : null;
                      const isCoeff = i === 0;
                      return (
                        <td key={k} style={{
                          ...tdS,
                          color: isCoeff ? "#2563eb" : "#333",
                          fontWeight: isCoeff ? 700 : 400,
                        }}>
                          {val !== null && isFinite(val) ? val.toFixed(4) : val !== null ? "—" : ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {n2 > maxCols && (
          <div className="lagrange-note" style={{ marginTop: 10 }}>
            表格已截断：显示前 {maxCols} 阶均差（共 {n2-1} 阶）。
          </div>
        )}
      </PanelCard>

      <PanelCard title="Newton 系数" summary="第一行 dd[0][k] 直接构成重节点 Newton 形式的各阶系数。">
        <div className="lagrange-note">
          <strong>dd[0][k]：</strong>
          {dd[0].slice(0, Math.min(n2, 8)).map((c, k) => (
            <span key={k} style={{ marginLeft:10, color:"#2563eb" }}>
              c<sub>{k}</sub>={isFinite(c) ? c.toFixed(5) : "—"}
            </span>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}

// ── Tab 4: Step-by-step construction ─────────────────────────────────────────

function StepTab({ pts, dyArr }) {
  const [step, setStep] = useState(0);

  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const { z, dd } = buildHermiteDDTable(xArr, yArr, dyArr);
  const n2 = z.length;
  const coeffsAll = dd[0];

  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);

  // Precompute running Newton polynomials: step k uses coeffs[0..k]
  const runningSums = Array.from({length: n2+1}, (_, k) => {
    if (k === 0) return new Array(FINE_N).fill(0);
    const partCoeffs = coeffsAll.slice(0, k);
    return xFine.map(x => newtonEval(z.slice(0, k), partCoeffs, x));
  });

  const allY = runningSums.flat().filter(isFinite);
  const yMin = Math.min(...allY, ...yArr) - 0.5;
  const yMax = Math.max(...allY, ...yArr) + 0.5;

  const p = makePlot(620, 320);

  // Determine if step adds function or derivative condition
  function stepInfo(k) {
    if (k < 1 || k > n2) return null;
    const idx = k - 1; // z index being added (0-based)
    const nodeIdx = Math.floor(idx / 2);
    if (idx % 2 === 0) {
      return { type: "f", nodeIdx, desc: `添加节点 z[${idx}] = x[${nodeIdx}] = ${z[idx].toFixed(3)}（函数值条件: H(x${nodeIdx}) = ${yArr[nodeIdx].toFixed(4)}）` };
    } else {
      return { type: "df", nodeIdx, desc: `添加重节点 z[${idx}] = x[${nodeIdx}] = ${z[idx].toFixed(3)}（导数条件: H'(x${nodeIdx}) = ${dyArr[nodeIdx].toFixed(4)}）` };
    }
  }

  const info = stepInfo(step);

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="逐项构建"
        title="用滑块逐步观察重节点 Newton 多项式如何长出来"
        summary="控制条、步骤说明和构建图分层摆放，读者可以先操作，再看当前步骤加入的是函数值还是导数条件。"
        pills={[`${step} / ${n2}`, info ? (info.type === "df" ? "导数条件" : "函数值条件") : "等待构建", "Newton 展开"]}
      />

      <section className="lagrange-toolbar-card">
        <div className="lagrange-toolbar">
          <label className="visualizer-slider" style={{ minWidth:260 }}>
            <div className="visualizer-control-head">
              <span>构建步骤 k</span>
              <strong>{step} / {n2}</strong>
            </div>
            <input type="range" min={0} max={n2} step={1} value={step}
              onChange={e=>setStep(Number(e.target.value))}/>
          </label>
          <button className="lp-btn" onClick={()=>setStep(0)}>归零</button>
          <button className="lp-btn" onClick={()=>setStep(n2)}>全部</button>
          <button className="lp-btn" onClick={()=>setStep(s=>Math.max(0,s-1))}>上一步</button>
          <button className="lp-btn" onClick={()=>setStep(s=>Math.min(n2,s+1))}>下一步</button>
        </div>
      </section>

      {info && (
        <PanelCard title={`步骤 ${step}`} summary={info.desc}>
          <div
            className="lagrange-note"
            style={{
              background: info.type === "f" ? "#dbeafe" : "#fef3c7",
              borderColor: info.type === "f" ? "#93c5fd" : "#fcd34d",
              color: info.type === "f" ? "#1d4ed8" : "#92400e",
            }}
          >
            {info.type === "f" ? "当前加入函数值约束。" : "当前加入导数约束。"}
          </div>
        </PanelCard>
      )}

      <PanelCard
        title="逐步构建图"
        summary="蓝线是当前多项式，灰色虚线是上一步；红点表示函数值已加入，橙圈表示导数条件已加入。"
        className="lagrange-plot-panel"
      >
        <svg
          className="lagrange-svg"
          width={p.w}
          height={p.h}
          viewBox={`0 0 ${p.w} ${p.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", display:"block" }}
        >
          <Axes p={p} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}/>

          {step > 1 && (
            <polyline points={p.pts(xFine,runningSums[step-1],xMin,xMax,yMin,yMax)}
              fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 3" opacity={0.5}/>
          )}

          {step > 0 && (
            <polyline points={p.pts(xFine,runningSums[step],xMin,xMax,yMin,yMax)}
              fill="none" stroke="#2563eb" strokeWidth={2.8}/>
          )}

          {pts.map((pt, i) => {
            const zIdxF  = 2 * i;
            const zIdxDf = 2 * i + 1;
            const fDone  = step > zIdxF;
            const dfDone = step > zIdxDf;
            return (
              <g key={i}>
                <circle cx={p.tx(pt.x,xMin,xMax)} cy={p.ty(pt.y,yMin,yMax)}
                  r={6} fill={fDone ? "#e63946" : "#ccc"} stroke="#fff" strokeWidth={1.5}/>
                {dfDone && (
                  <circle cx={p.tx(pt.x,xMin,xMax)} cy={p.ty(pt.y,yMin,yMax)}
                    r={9} fill="none" stroke="#f4a261" strokeWidth={2}/>
                )}
              </g>
            );
          })}

          {step === 0 && (
            <text x={p.w/2} y={p.h/2} textAnchor="middle" fill="#bbb" fontSize={18}>
              拖动滑块开始逐步构建
            </text>
          )}

          {step > 0 && (
            <Legend items={[
              {color:"#2563eb",label:`H_${step-1}(x)（前 ${step} 项 Newton 展开）`,width:2.8},
              {color:"#e63946",label:"已添加函数值节点",rect:true},
              {color:"#f4a261",label:"已添加导数条件"},
            ]} x={p.pad.left+8} y={p.pad.top+6}/>
          )}
        </svg>
      </PanelCard>

      <PanelCard title="阅读提示">
        <div className="lagrange-note">
          H(x) 以重节点 Newton 形式构建：每步添加一个重复节点（偶数步加函数值条件，奇数步加导数条件）。橙色圆圈表示该节点的导数条件也已加入。
        </div>
      </PanelCard>
    </div>
  );
}

// ── Tab 5: Compare Hermite vs Lagrange vs sin ─────────────────────────────────

function CompareTab({ pts, dyArr }) {
  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const { z, dd } = buildHermiteDDTable(xArr, yArr, dyArr);
  const coeffs = dd[0];

  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);

  const yH    = xFine.map(x => newtonEval(z, coeffs, x));
  const yL    = xFine.map(x => lagrangeInterp(xArr, yArr, x));
  const yRef  = xFine.map(TEST_F);

  const allY = [...yH, ...yL, ...yRef].filter(isFinite);
  const yMin = Math.min(...allY) - 0.3;
  const yMax = Math.max(...allY) + 0.3;

  const errH = xFine.map((_, i) => Math.abs(yH[i] - yRef[i]));
  const errL = xFine.map((_, i) => Math.abs(yL[i] - yRef[i]));

  const maxErrH = Math.max(...errH.filter(isFinite));
  const maxErrL = Math.max(...errL.filter(isFinite));
  const rmseH = Math.sqrt(errH.filter(isFinite).reduce((s,v)=>s+v*v,0)/errH.filter(isFinite).length);
  const rmseL = Math.sqrt(errL.filter(isFinite).reduce((s,v)=>s+v*v,0)/errL.filter(isFinite).length);

  const errLogMax = Math.ceil(Math.log10(Math.max(maxErrH, maxErrL, 1e-10))) + 1;
  const errLogMin = -16;
  const logH = errH.map(v => Math.log10(Math.max(v, 1e-16)));
  const logL = errL.map(v => Math.log10(Math.max(v, 1e-16)));

  const pMain = makePlot(620, 300);
  const pErr  = makePlot(620, 200, { top:14, right:16, bottom:28, left:50 });

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="方法对比"
        title="把 Hermite、Lagrange 和 sin(x) 放在同一阅读层里比较"
        summary="左侧负责曲线和误差图，右侧只放指标和解释，避免指标散在图表下方造成视线跳跃。"
        pills={["Hermite", "Lagrange", "sin(x)"]}
      />

      <div className="lagrange-plot-grid">
        <PanelCard
          title="函数曲线与误差对比"
          summary="上图比较函数形态，下图用对数尺度比较误差大小。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={pMain.w}
            height={pMain.h}
            viewBox={`0 0 ${pMain.w} ${pMain.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border:"1px solid #e5e7eb", borderRadius:"8px 8px 0 0", background:"#fff", display:"block" }}
          >
            <Axes p={pMain} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}/>
            <polyline points={pMain.pts(xFine,yRef,xMin,xMax,yMin,yMax)}
              fill="none" stroke="#222" strokeWidth={2}/>
            <polyline points={pMain.pts(xFine,yL,xMin,xMax,yMin,yMax)}
              fill="none" stroke="#e63946" strokeWidth={2} strokeDasharray="7 3"/>
            <polyline points={pMain.pts(xFine,yH,xMin,xMax,yMin,yMax)}
              fill="none" stroke="#2563eb" strokeWidth={2.5}/>
            {pts.map((pt, i) => (
              <circle key={i} cx={pMain.tx(pt.x,xMin,xMax)} cy={pMain.ty(pt.y,yMin,yMax)}
                r={5} fill="#333" stroke="#fff" strokeWidth={1.5}/>
            ))}
            <Legend items={[
              {color:"#222",label:"sin(x) 参考函数"},
              {color:"#e63946",label:"Lagrange P(x)",dash:"7 3"},
              {color:"#2563eb",label:"Hermite H(x)"},
              {color:"#333",label:"数据节点",rect:true},
            ]} x={pMain.pad.left+8} y={pMain.pad.top+6}/>
          </svg>

          <svg
            className="lagrange-svg"
            width={pErr.w}
            height={pErr.h}
            viewBox={`0 0 ${pErr.w} ${pErr.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border:"1px solid #e5e7eb", borderTop:"none", borderRadius:"0 0 8px 8px", background:"#fafafa", display:"block" }}
          >
            <Axes p={pErr} xMin={xMin} xMax={xMax} yMin={errLogMin} yMax={errLogMax} yLabel="log₁₀|误差|"/>
            <polyline points={pErr.pts(xFine,logL,xMin,xMax,errLogMin,errLogMax)}
              fill="none" stroke="#e63946" strokeWidth={1.5} strokeDasharray="7 3"/>
            <polyline points={pErr.pts(xFine,logH,xMin,xMax,errLogMin,errLogMax)}
              fill="none" stroke="#2563eb" strokeWidth={1.8}/>
          </svg>
        </PanelCard>

        <PanelCard title="误差指标" summary="Hermite 额外利用导数信息，自由度是 Lagrange 的两倍。">
          <div className="lagrange-kpi-grid">
            <MetricCard label="Hermite 最大误差" value={maxErrH.toExponential(4)} hint={`RMSE ${rmseH.toExponential(4)}`} />
            <MetricCard label="Lagrange 最大误差" value={maxErrL.toExponential(4)} hint={`RMSE ${rmseL.toExponential(4)}`} tone="is-danger" />
          </div>
          <div className="lagrange-note" style={{ marginTop: 12 }}>
            在相同节点位置下，Hermite 多项式额外匹配了 {pts.length} 个导数值，自由度是 Lagrange 的两倍（2n-1 次 vs. n-1 次）。
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

// ── Tab 6: Error analysis with sin(x) ────────────────────────────────────────

function ErrorTab({ pts, setPts, dyArr, setDyArr }) {
  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const { z, dd } = buildHermiteDDTable(xArr, yArr, dyArr);
  const coeffs = dd[0];

  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);

  const yH    = xFine.map(x => newtonEval(z, coeffs, x));
  const yRef  = xFine.map(TEST_F);
  const errH  = xFine.map((_, i) => Math.abs(yH[i] - yRef[i]));
  const maxErr = Math.max(...errH.filter(isFinite));
  const maxIdx = errH.indexOf(maxErr);
  const rmse   = Math.sqrt(errH.filter(isFinite).reduce((s,v)=>s+v*v,0)/errH.filter(isFinite).length);

  const allY = [...yH.filter(isFinite), ...yRef];
  const yMin = Math.min(...allY) - 0.3;
  const yMax = Math.max(...allY) + 0.3;
  const errLogMax = Math.ceil(Math.log10(Math.max(maxErr, 1e-10))) + 1;
  const errLogMin = -16;
  const errLog = errH.map(v => Math.log10(Math.max(v, 1e-16)));

  const pFn  = makePlot(620, 260);
  const pErr = makePlot(620, 200);

  function loadSinData() {
    const n = pts.length;
    const xs = linspace(0, 7, n);
    setPts(xs.map(x => ({ x, y: TEST_F(x) })));
    setDyArr(xs.map(x => TEST_DF(x)));
  }

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="误差分析"
        title="单独查看 Hermite 与 sin(x) 的函数误差分布"
        summary="数据集操作、函数对比图、误差图和指标各自独立成块，避免图表和按钮混排。"
        pills={[`节点 ${pts.length}`, `最大误差 ${maxErr.toExponential(2)}`, `RMSE ${rmse.toExponential(2)}`]}
      />

      <section className="lagrange-toolbar-card">
        <div className="lagrange-card-head">
          <div>
            <h4>测试数据集</h4>
            <p>加载 sin(x) 数据集后，节点值和导数值会同步替换为参考函数。</p>
          </div>
        </div>
        <div className="lagrange-toolbar">
          <button className="lp-btn" onClick={loadSinData}>
            加载 sin(x) 数据集
          </button>
          <button className="lp-btn" onClick={() => {
            setPts(INIT_X.map((x,i)=>({x,y:INIT_Y[i]})));
            setDyArr([...INIT_DY]);
          }}>重置原始数据</button>
          <span className="lagrange-inline-stat">
            节点数 <strong>{pts.length}</strong>
          </span>
        </div>
      </section>

      <div className="lagrange-compare-grid">
        <PanelCard
          title="H(x) 与 sin(x) 对比"
          summary="黑线是参考函数，蓝色虚线是 Hermite 插值，红点是当前插值节点。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={pFn.w}
            height={pFn.h}
            viewBox={`0 0 ${pFn.w} ${pFn.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", display:"block" }}
          >
            <Axes p={pFn} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}/>
            <polyline points={pFn.pts(xFine,yRef,xMin,xMax,yMin,yMax)}
              fill="none" stroke="#222" strokeWidth={2}/>
            <polyline points={pFn.pts(xFine,yH,xMin,xMax,yMin,yMax)}
              fill="none" stroke="#2563eb" strokeWidth={2.2} strokeDasharray="6 3"/>
            {pts.map((pt, i) => (
              <circle key={i} cx={pFn.tx(pt.x,xMin,xMax)} cy={pFn.ty(pt.y,yMin,yMax)}
                r={5} fill="#e63946" stroke="#fff" strokeWidth={1.5}/>
            ))}
            <Legend items={[
              {color:"#222",label:"sin(x)"},
              {color:"#2563eb",label:"H(x) Hermite 插值",dash:"6 3"},
              {color:"#e63946",label:"插值节点",rect:true},
            ]} x={pFn.pad.left+8} y={pFn.pad.top+6}/>
          </svg>
        </PanelCard>

        <PanelCard
          title="误差（对数尺度）"
          summary="红点标记当前最大误差位置，用对数尺度突出端点和节点附近的误差变化。"
          className="lagrange-plot-panel"
        >
          <svg
            className="lagrange-svg"
            width={pErr.w}
            height={pErr.h}
            viewBox={`0 0 ${pErr.w} ${pErr.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", display:"block" }}
          >
            <Axes p={pErr} xMin={xMin} xMax={xMax} yMin={errLogMin} yMax={errLogMax} yLabel="log₁₀|H-sin|"/>
            <polyline points={pErr.pts(xFine,errLog,xMin,xMax,errLogMin,errLogMax)}
              fill="none" stroke="#2563eb" strokeWidth={1.8}/>
            {isFinite(errLog[maxIdx]) && (
              <g>
                <circle cx={pErr.tx(xFine[maxIdx],xMin,xMax)} cy={pErr.ty(errLog[maxIdx],errLogMin,errLogMax)}
                  r={7} fill="#e63946" stroke="#fff" strokeWidth={2}/>
                <text x={pErr.tx(xFine[maxIdx],xMin,xMax)+10}
                  y={pErr.ty(errLog[maxIdx],errLogMin,errLogMax)-4}
                  fontSize={10} fill="#e63946">最大: {maxErr.toExponential(2)}</text>
              </g>
            )}
          </svg>
        </PanelCard>
      </div>

      <div className="lagrange-kpi-grid">
        <MetricCard label="最大误差" value={maxErr.toExponential(4)} tone="is-danger" />
        <MetricCard label="RMSE" value={rmse.toExponential(4)} />
        <MetricCard label="节点数" value={String(pts.length)} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "main", label: "主演示", hint: "节点、导数与主曲线联动" },
  { id: "deriv", label: "导数可视化", hint: "把 H(x) 与 H'(x) 拆开看" },
  { id: "ddtab", label: "重节点均差表", hint: "重节点如何进入 Newton 系数" },
  { id: "step", label: "逐步构建", hint: "逐项添加函数值与导数条件" },
  { id: "compare", label: "对比分析", hint: "Hermite vs Lagrange vs sin" },
  { id: "error", label: "误差分析", hint: "单独看与 sin(x) 的误差分布" }
];

export function HermiteClassicPage() {
  const [tab, setTab] = useState("main");
  const [pts, setPts] = useState(() => INIT_X.map((x, i) => ({ x, y: INIT_Y[i] })));
  const [dyArr, setDyArr] = useState([...INIT_DY]);
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];

  return (
    <ContentPageShell
      kicker="内容实验 / 导数条件 / 重节点 / 误差"
      title="把经典 Hermite 插值的 6 个视角收成一页实验台"
      summary="把主演示、导数可视化、重节点均差表、逐步构建、方法对比和误差分析收进统一结构里，避免图、表、公式彼此割裂。"
      metaCards={[
        {
          label: "当前视角",
          value: activeTab.label,
          hint: activeTab.hint
        },
        {
          label: "实验模块",
          value: "6 个选项卡",
          hint: "从主图交互一直覆盖到重节点均差表和误差分析。"
        },
        {
          label: "当前节点",
          value: `${pts.length} 个节点 / ${pts.length} 个导数`,
          hint: "Hermite 通过导数约束把自由度提升到 2n-1 次。"
        }
      ]}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      ariaLabel="经典 Hermite 内容切换"
    >
      {tab==="main"    && <MainTab    pts={pts} setPts={setPts} dyArr={dyArr} setDyArr={setDyArr}/>}
      {tab==="deriv"   && <DerivTab   pts={pts} dyArr={dyArr}/>}
      {tab==="ddtab"   && <HermiteDDTab pts={pts} dyArr={dyArr}/>}
      {tab==="step"    && <StepTab    pts={pts} dyArr={dyArr}/>}
      {tab==="compare" && <CompareTab pts={pts} dyArr={dyArr}/>}
      {tab==="error"   && <ErrorTab   pts={pts} setPts={setPts} dyArr={dyArr} setDyArr={setDyArr}/>}
    </ContentPageShell>
  );
}
