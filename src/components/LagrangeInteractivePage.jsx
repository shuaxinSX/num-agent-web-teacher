import { useRef, useState } from "react";
import "./lagrangeInteractivePage.css";

// ── math ─────────────────────────────────────────────────────────────────────

function lagrangeBasis(xArr, k, x0) {
  let L = 1;
  for (let j = 0; j < xArr.length; j++) {
    if (j !== k) L *= (x0 - xArr[j]) / (xArr[k] - xArr[j]);
  }
  return L;
}

function lagrangeInterp(xArr, yArr, x0) {
  let y = 0;
  for (let k = 0; k < xArr.length; k++) y += yArr[k] * lagrangeBasis(xArr, k, x0);
  return y;
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
  "#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#a8dadc","#6a4c93","#f77f00","#06d6a0"
];

// Build a plot context so all helpers use the same dimensions + padding
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
  // clamp y=0 line
  const zero = Math.max(p.pad.top, Math.min(p.pad.top + p.ph, p.ty(0, yMin, yMax)));
  return (
    <g fontSize={10} fill="#555">
      {/* grid + x ticks */}
      {xTicks.map(v => (
        <g key={v}>
          <line x1={p.tx(v,xMin,xMax)} y1={p.pad.top} x2={p.tx(v,xMin,xMax)} y2={p.pad.top+p.ph} stroke="#eee" strokeWidth={1}/>
          <text x={p.tx(v,xMin,xMax)} y={p.pad.top+p.ph+13} textAnchor="middle">{v % 1 === 0 ? v : v.toFixed(1)}</text>
        </g>
      ))}
      {/* grid + y ticks */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={p.pad.left} y1={p.ty(v,yMin,yMax)} x2={p.pad.left+p.pw} y2={p.ty(v,yMin,yMax)} stroke="#eee" strokeWidth={1}/>
          <text x={p.pad.left-4} y={p.ty(v,yMin,yMax)+4} textAnchor="end">{Math.abs(v) >= 1000 ? v.toExponential(1) : v % 1 === 0 ? v : v.toFixed(1)}</text>
        </g>
      ))}
      {/* axes borders */}
      <rect x={p.pad.left} y={p.pad.top} width={p.pw} height={p.ph} fill="none" stroke="#ccc" strokeWidth={1}/>
      {/* x=0 or y=0 reference lines */}
      <line x1={p.pad.left} y1={zero} x2={p.pad.left+p.pw} y2={zero} stroke="#bbb" strokeWidth={1}/>
      {/* labels */}
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
            : <line x1={0} y1={5} x2={20} y2={5} stroke={item.color} strokeWidth={item.width||2}/>}
          <text x={24} y={9}>{item.label}</text>
        </g>
      ))}
    </g>
  );
}

// ── constants ─────────────────────────────────────────────────────────────────

const TEST_F  = x => 1 / (1 + x * x);           // 龙格函数
const INIT_X  = [-5, -10/3, -5/3, 0, 5/3, 10/3, 5]; // 7 等距节点 on [-5,5]
const INIT_Y  = INIT_X.map(TEST_F);

const lpInputS = { width:90, padding:"2px 6px", border:"1px solid #d1d5db", borderRadius:4, fontSize:12, textAlign:"center" };
const FINE_N = 500;

function SectionLead({ kicker, title, summary, pills = [] }) {
  return (
    <div className="lagrange-stage-intro">
      <div className="lagrange-stage-copy">
        <span className="lagrange-stage-kicker">{kicker}</span>
        <h3>{title}</h3>
        <p>{summary}</p>
      </div>
      {pills.length > 0 && (
        <div className="lagrange-stage-pills">
          {pills.map((pill) => (
            <span key={pill} className="lagrange-stage-pill">{pill}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelCard({ title, summary, children, className = "" }) {
  return (
    <section className={`lagrange-card ${className}`.trim()}>
      {(title || summary) && (
        <div className="lagrange-card-head">
          <div>
            {title ? <h4>{title}</h4> : null}
            {summary ? <p>{summary}</p> : null}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

function MetricCard({ label, value, hint, tone = "" }) {
  const className = tone ? `lagrange-kpi ${tone}` : "lagrange-kpi";
  return (
    <div className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

// ── Tab 1: Main demo ──────────────────────────────────────────────────────────

function MainTab({ pts, setPts }) {
  const [evalX, setEvalX]       = useState("5.0");
  const [evalMark, setEvalMark] = useState(null);   // {x, y}
  const [showBasis, setShowBasis] = useState(false);
  const [addMode, setAddMode]   = useState(false);
  const [delMode, setDelMode]   = useState(false);
  // lower sub-panels (error analysis)
  const [showError, setShowError] = useState(false);
  const svgRef = useRef(null);

  const xArr = pts.map(p => p.x);
  const yArr = pts.map(p => p.y);
  const xMin = Math.min(...xArr) - 0.5;
  const xMax = Math.max(...xArr) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);
  const yFine = xFine.map(x => lagrangeInterp(xArr, yArr, x));

  const yFineSafe = yFine.filter(isFinite);
  const ySpanMain = Math.max(...yFineSafe, ...yArr) - Math.min(...yFineSafe, ...yArr);
  const yPadMain  = Math.max(0.3, ySpanMain * 0.2);
  const yMin = Math.min(...yFineSafe, ...yArr) - yPadMain;
  const yMax = Math.max(...yFineSafe, ...yArr) + yPadMain;

  const pMain = makePlot(620, 300);
  const pBasis = makePlot(300, 300);

  // test function for error analysis
  const yExact = xFine.map(TEST_F);
  const errAbs = xFine.map((_, i) => Math.abs(yFine[i] - yExact[i]));
  const maxErr = Math.max(...errAbs.filter(isFinite));
  const maxIdx = errAbs.indexOf(maxErr);
  const rmse = Math.sqrt(errAbs.filter(isFinite).reduce((s, v) => s + v * v, 0) / errAbs.filter(isFinite).length);
  const pEval  = makePlot(300, 200);
  const pError = makePlot(300, 200);

  // basis
  const basisYMin = -0.5, basisYMax = 1.5;
  const basisCurves = xArr.map((_, k) => xFine.map(x => lagrangeBasis(xArr, k, x)));

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
    const yv = lagrangeInterp(xArr, yArr, v);
    setEvalMark({ x: v, y: yv });
  }

  const evalAllY = [...yFine.filter(isFinite), ...yExact, ...yArr];
  const evalSpan = Math.max(...evalAllY) - Math.min(...evalAllY);
  const evalPad  = Math.max(0.3, evalSpan * 0.2);
  const evalYMin = Math.min(...evalAllY) - evalPad;
  const evalYMax = Math.max(...evalAllY) + evalPad;
  const errLogMin = -16;
  const errLogMax = Math.ceil(Math.log10(Math.max(maxErr, 1e-10))) + 1;
  const errLog = errAbs.map(v => Math.log10(Math.max(v, 1e-16)));

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="自由编辑节点、曲线与误差联动"
        title="直接修改插值节点，立刻看到曲线、求值点和误差如何变化"
        summary="这一页把节点编辑、插值曲线、基函数和误差曲线放在同一块实验台里。先改节点，再决定是否打开基函数和误差视图做下钻。"
        pills={[
          `当前节点数 ${pts.length}`,
          showBasis ? "基函数面板已打开" : "可展开基函数面板",
          showError ? "误差分析已打开" : "可展开误差分析"
        ]}
      />

      <div className="lagrange-focus-grid">
        <PanelCard
          title="拉格朗日多项式插值"
          summary="主图集中放曲线、节点和求值标记，所有交互都围绕这一张图展开。"
          className="lagrange-plot-panel"
        >
          <svg ref={svgRef} width={pMain.w} height={pMain.h} viewBox={`0 0 ${pMain.w} ${pMain.h}`}
            className="lagrange-svg"
            style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", cursor }}
            onClick={handleSvgClick}>
            <Axes p={pMain} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}/>
            <polyline points={pMain.pts(xFine,yFine,xMin,xMax,yMin,yMax)} fill="none" stroke="#2563eb" strokeWidth={2.5}/>
            {pts.map((pt,i)=>(
              <g key={i}>
                <circle cx={pMain.tx(pt.x,xMin,xMax)} cy={pMain.ty(pt.y,yMin,yMax)}
                  r={6} fill="#e63946" stroke="#fff" strokeWidth={1.5}/>
                <text x={pMain.tx(pt.x,xMin,xMax)+8} y={pMain.ty(pt.y,yMin,yMax)-5}
                  fontSize={9} fill="#555">({pt.x.toFixed(1)}, {pt.y.toFixed(1)})</text>
              </g>
            ))}
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
              {color:"#2563eb",label:"插值曲线"},
              {color:"#e63946",label:"数据点",rect:true},
              ...(evalMark?[{color:"#06d6a0",label:"求值点",rect:true}]:[]),
            ]} x={pMain.pad.left+8} y={pMain.pad.top+8}/>
          </svg>
        </PanelCard>

        <div className="lagrange-rail">
          <section className="lagrange-toolbar-card">
            <div className="lagrange-card-head">
              <div>
                <h4>节点与求值控制</h4>
                <p>把增删点、求值和辅助视图切换收在右侧，避免实验画面被一排按钮打散。</p>
              </div>
            </div>
            <div className="lagrange-toolbar">
              <button className={`lp-btn${addMode?" lp-btn-active":""}`}
                onClick={() => { setAddMode(v=>!v); setDelMode(false); }}>
                {addMode ? "⊕ 点击图形添加点…" : "添加点"}
              </button>
              <button className={`lp-btn${delMode?" lp-btn-active":""}`}
                onClick={() => { setDelMode(v=>!v); setAddMode(false); }}
                disabled={pts.length<=2}>
                {delMode ? "✕ 点击要删除的点…" : "删除点"}
              </button>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, cursor:"pointer", minHeight:40 }}>
                <input type="checkbox" checked={showBasis} onChange={e=>setShowBasis(e.target.checked)}/>
                显示基函数
              </label>
              <button className="lp-btn" onClick={() => setShowError(v=>!v)}>
                {showError ? "隐藏误差曲线" : "显示误差曲线"}
              </button>
              <button className="lp-btn" onClick={() => {
                setPts(INIT_X.map((x,i)=>({x,y:INIT_Y[i]})));
                setEvalMark(null); setAddMode(false); setDelMode(false); setShowError(false);
              }}>重置</button>
              <span className="lagrange-inline-stat">
                <span>节点数</span>
                <strong>{pts.length}</strong>
              </span>
              <span className="lagrange-eval-strip">
                在 x =&nbsp;
                <input type="text" value={evalX} onChange={e=>setEvalX(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleEval()}
                  className="lagrange-table-input"
                  style={{ maxWidth:72 }}/>
                <button className="lp-btn" onClick={handleEval}>计算插值</button>
                {evalMark && (
                  <span className="lagrange-inline-stat">
                    <span>y</span>
                    <strong>{evalMark.y.toFixed(6)}</strong>
                  </span>
                )}
              </span>
            </div>
          </section>

          {showBasis ? (
            <PanelCard
              title="拉格朗日基函数 Lₖ(x)"
              summary="基函数放在右侧参考区，不打断主图阅读。"
              className="lagrange-side-panel"
            >
              <svg width={pBasis.w} height={pBasis.h} viewBox={`0 0 ${pBasis.w} ${pBasis.h}`}
                className="lagrange-svg"
                style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
                <Axes p={pBasis} xMin={xMin} xMax={xMax} yMin={basisYMin} yMax={basisYMax} yLabel="Lₖ(x)"/>
                <line x1={pBasis.pad.left} y1={pBasis.ty(0,basisYMin,basisYMax)}
                  x2={pBasis.pad.left+pBasis.pw} y2={pBasis.ty(0,basisYMin,basisYMax)}
                  stroke="#aaa" strokeDasharray="4 2" strokeWidth={1}/>
                <line x1={pBasis.pad.left} y1={pBasis.ty(1,basisYMin,basisYMax)}
                  x2={pBasis.pad.left+pBasis.pw} y2={pBasis.ty(1,basisYMin,basisYMax)}
                  stroke="#aaa" strokeDasharray="4 2" strokeWidth={1}/>
                {basisCurves.map((ys,k)=>(
                  <g key={k}>
                    <polyline points={pBasis.pts(xFine,ys,xMin,xMax,basisYMin,basisYMax)}
                      fill="none" stroke={PALETTE[k%PALETTE.length]} strokeWidth={1.8}/>
                    <circle cx={pBasis.tx(xArr[k],xMin,xMax)} cy={pBasis.ty(1,basisYMin,basisYMax)}
                      r={5} fill={PALETTE[k%PALETTE.length]} stroke="#fff" strokeWidth={1.5}/>
                    <text x={pBasis.tx(xArr[k],xMin,xMax)} y={pBasis.ty(1,basisYMin,basisYMax)-8}
                      fontSize={9} textAnchor="middle" fill={PALETTE[k%PALETTE.length]}>L{k+1}</text>
                  </g>
                ))}
              </svg>
            </PanelCard>
          ) : (
            <div className="lagrange-note">
              <strong>建议：</strong>先在主图里移动或增删节点，再打开基函数面板看每个 <code>Lₖ(x)</code> 如何共同拼出最终曲线。
            </div>
          )}

          <PanelCard
            title="节点坐标编辑"
        summary="节点表格收成独立卡片，便于在图形编辑和精确输入之间切换。"
        className="lagrange-table-card"
      >
        <div className="lagrange-table-wrap">
          <table className="lagrange-data-table">
            <thead>
              <tr>
                <th>i</th>
                <th>x<sub>i</sub></th>
                <th>y<sub>i</sub></th>
              </tr>
            </thead>
            <tbody>
              {pts.map((pt, i) => (
                <tr key={i}>
                  <td>{i}</td>
                  <td>
                    <input type="number" key={`x-${i}-${pt.x}`} defaultValue={pt.x} step="0.1"
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setPts(prev => {
                          const next = [...prev]; next[i] = { ...next[i], x: v };
                          return next.sort((a, b) => a.x - b.x);
                        });
                      }}
                      onKeyDown={e => e.key === "Enter" && e.target.blur()}
                      className="lagrange-table-input"
                      style={lpInputS}/>
                  </td>
                  <td>
                    <input type="number" key={`y-${i}-${pt.y}`} defaultValue={pt.y} step="0.1"
                      onBlur={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setPts(prev => { const next=[...prev]; next[i]={...next[i], y:v}; return next; });
                      }}
                      onKeyDown={e => e.key === "Enter" && e.target.blur()}
                      className="lagrange-table-input"
                      style={lpInputS}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      {showError && (
        <PanelCard
          title="误差分析"
          summary="误差区域默认折叠，展开后把函数对比、对数误差和关键统计放到一个完整分析块里。"
        >
          <div className="lagrange-error-row">
            <div className="lagrange-error-panel">
              <div style={{ fontSize:12, color:"#555", marginBottom:6 }}>函数与插值对比</div>
              <svg width={pEval.w} height={pEval.h} viewBox={`0 0 ${pEval.w} ${pEval.h}`}
                className="lagrange-svg"
                style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
                <Axes p={pEval} xMin={xMin} xMax={xMax} yMin={evalYMin} yMax={evalYMax}/>
                <polyline points={pEval.pts(xFine,yExact,xMin,xMax,evalYMin,evalYMax)}
                  fill="none" stroke="#e63946" strokeWidth={2}/>
                <polyline points={pEval.pts(xFine,yFine,xMin,xMax,evalYMin,evalYMax)}
                  fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 3"/>
                {pts.map((pt,i)=>(
                  <circle key={i} cx={pEval.tx(pt.x,xMin,xMax)} cy={pEval.ty(pt.y,evalYMin,evalYMax)}
                    r={4} fill="#333" stroke="#fff" strokeWidth={1}/>
                ))}
                <Legend items={[
                  {color:"#e63946",label:"龙格函数"},
                  {color:"#2563eb",label:"拉格朗日插值",dash:"6 3"},
                  {color:"#333",label:"插值节点",rect:true},
                ]} x={pEval.pad.left+4} y={pEval.pad.top+4}/>
              </svg>
            </div>
            <div className="lagrange-error-panel">
              <div style={{ fontSize:12, color:"#555", marginBottom:6 }}>插值误差（对数尺度）</div>
              <svg width={pError.w} height={pError.h} viewBox={`0 0 ${pError.w} ${pError.h}`}
                className="lagrange-svg"
                style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
                <Axes p={pError} xMin={xMin} xMax={xMax} yMin={errLogMin} yMax={errLogMax} yLabel="log₁₀|误差|"/>
                <polyline points={pError.pts(xFine,errLog,xMin,xMax,errLogMin,errLogMax)}
                  fill="none" stroke="#333" strokeWidth={1.8}/>
                <circle cx={pError.tx(xFine[maxIdx],xMin,xMax)} cy={pError.ty(errLog[maxIdx],errLogMin,errLogMax)}
                  r={6} fill="#e63946" stroke="#fff" strokeWidth={2}/>
                <text x={pError.tx(xFine[maxIdx],xMin,xMax)+8}
                  y={pError.ty(errLog[maxIdx],errLogMin,errLogMax)-4}
                  fontSize={9} fill="#e63946">最大: {maxErr.toExponential(2)}</text>
              </svg>
            </div>
          </div>
          <div className="lagrange-kpi-grid" style={{ marginTop: 14 }}>
            <MetricCard label="最大误差" value={maxErr.toExponential(4)} hint="最坏点通常出现在区间边缘" tone="is-danger" />
            <MetricCard label="RMSE" value={rmse.toExponential(4)} hint="看整体误差而不是只看峰值" />
            <MetricCard label="当前节点数" value={String(pts.length)} hint="节点越多不等于误差必然更小" />
          </div>
          </PanelCard>
        )}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Runge phenomenon — slider ─────────────────────────────────────────

const RUNGE_F = x => 1 / (1 + x * x);
const RUNGE_RANGE = [-5, 5];

function RungeTab() {
  const [n, setN] = useState(5);
  const xDense = linspace(RUNGE_RANGE[0], RUNGE_RANGE[1], 800);
  const yExact = xDense.map(RUNGE_F);
  const p = makePlot(620, 300);

  const xEqui = linspace(RUNGE_RANGE[0], RUNGE_RANGE[1], n);
  const yEqui = xEqui.map(RUNGE_F);
  const xCheb = chebyshevNodes(RUNGE_RANGE[0], RUNGE_RANGE[1], n);
  const yCheb = xCheb.map(RUNGE_F);
  const yEquiInterp = xDense.map(x => lagrangeInterp(xEqui, yEqui, x));
  const yChebInterp = xDense.map(x => lagrangeInterp(xCheb, yCheb, x));

  const yMin = -1.2, yMax = 2.0;
  const clamp = v => Math.max(yMin, Math.min(yMax, v));

  const equiMaxErr = Math.max(...xDense.map((x, i) => Math.abs(yEquiInterp[i] - yExact[i])).filter(isFinite));
  const chebMaxErr = Math.max(...xDense.map((x, i) => Math.abs(yChebInterp[i] - yExact[i])).filter(isFinite));

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="等距节点 vs 切比雪夫节点"
        title="用一张图直接看龙格现象为什么会在区间边缘爆发"
        summary="保持函数不变，只调节点数。等距节点会在端点附近产生高频振荡，而切比雪夫节点会把采样密度往边缘推，显著降低爆炸式误差。"
        pills={[`当前节点数 ${n}`, "区间 [−5, 5]", "龙格函数 1/(1+x²)"]}
      />

      <div className="lagrange-focus-grid">
        <PanelCard
          title="函数与两类插值曲线对比"
          summary="黑线是精确函数，红线是等距节点插值，绿色是切比雪夫节点插值。"
        >
          <svg width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`}
            className="lagrange-svg"
            style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
            <Axes p={p} xMin={RUNGE_RANGE[0]} xMax={RUNGE_RANGE[1]} yMin={yMin} yMax={yMax}/>
            <polyline points={p.pts(xDense,yExact,RUNGE_RANGE[0],RUNGE_RANGE[1],yMin,yMax)}
              fill="none" stroke="#222" strokeWidth={2}/>
            <polyline points={p.pts(xDense,yEquiInterp.map(clamp),RUNGE_RANGE[0],RUNGE_RANGE[1],yMin,yMax)}
              fill="none" stroke="#e63946" strokeWidth={2} strokeDasharray="7 3"/>
            <polyline points={p.pts(xDense,yChebInterp.map(clamp),RUNGE_RANGE[0],RUNGE_RANGE[1],yMin,yMax)}
              fill="none" stroke="#2a9d8f" strokeWidth={2}/>
            {xEqui.map((x,i)=>(
              <circle key={i} cx={p.tx(x,RUNGE_RANGE[0],RUNGE_RANGE[1])}
                cy={p.ty(yEqui[i],yMin,yMax)} r={4} fill="#e63946" stroke="#fff" strokeWidth={1}/>
            ))}
            {xCheb.map((x,i)=>(
              <rect key={i}
                x={p.tx(x,RUNGE_RANGE[0],RUNGE_RANGE[1])-4}
                y={p.ty(yCheb[i],yMin,yMax)-4}
                width={8} height={8} fill="#2a9d8f" stroke="#fff" strokeWidth={1}/>
            ))}
            <Legend items={[
              {color:"#222",label:"精确函数"},
              {color:"#e63946",label:"等距节点插值",dash:"7 3"},
              {color:"#2a9d8f",label:"切比雪夫节点插值"},
            ]} x={p.pad.left+8} y={p.pad.top+6}/>
          </svg>
        </PanelCard>

        <div className="lagrange-rail">
          <section className="lagrange-toolbar-card">
            <div className="lagrange-card-head">
              <div>
                <h4>节点数控制</h4>
                <p>把参数调整放到侧边，首屏先看边缘振荡，再回头调整节点数做对比。</p>
              </div>
            </div>
            <div className="lagrange-toolbar">
              <label className="visualizer-slider" style={{ minWidth:240, width:"min(100%, 320px)" }}>
                <div className="visualizer-control-head">
                  <span>节点数 n</span>
                  <strong>{n}</strong>
                </div>
                <input type="range" min={2} max={20} step={1} value={n} title={String(n)}
                  onChange={e => setN(Number(e.target.value))}/>
              </label>
              <button className="lp-btn" onClick={() => setN(s => Math.max(2, s - 1))}>◀ 减少</button>
              <button className="lp-btn" onClick={() => setN(s => Math.min(20, s + 1))}>增加 ▶</button>
              <button className="lp-btn" onClick={() => setN(5)}>重置</button>
            </div>
          </section>

          <div className="lagrange-kpi-grid">
            <MetricCard label="等距节点最大误差" value={equiMaxErr.toExponential(3)} hint="节点越多，端点振荡通常越明显" tone="is-danger" />
            <MetricCard label="切比雪夫节点最大误差" value={chebMaxErr.toExponential(3)} hint="把节点向端点集中后，误差会稳定得多" tone="is-safe" />
          </div>

          <div className="lagrange-note">
            <strong>结论：</strong>随着节点数增加，等距节点在区间边缘更容易出现大幅振荡；切比雪夫节点通过改变节点分布来抑制这种不稳定性。
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Step-by-step construction ─────────────────────────────────────────

function StepTab() {
  const [step, setStep] = useState(0);
  const n = INIT_X.length;
  const xMin = Math.min(...INIT_X) - 0.5;
  const xMax = Math.max(...INIT_X) + 0.5;
  const xFine = linspace(xMin, xMax, FINE_N);
  const p = makePlot(620, 320);

  // precompute contributions and running sums
  const contributions = INIT_X.map((_, k) => {
    const bk = xFine.map(x => lagrangeBasis(INIT_X, k, x));
    return xFine.map((_, i) => INIT_Y[k] * bk[i]);
  });
  const runningSums = [new Array(FINE_N).fill(0)];
  for (let k = 0; k < n; k++)
    runningSums.push(runningSums[k].map((v, i) => v + contributions[k][i]));

  const allY = runningSums.flat().filter(isFinite);
  const ySpan = Math.max(...allY,...INIT_Y) - Math.min(...allY,...INIT_Y);
  const yPad  = Math.max(0.3, ySpan * 0.25);
  const yMin  = Math.min(...allY, ...INIT_Y) - yPad;
  const yMax  = Math.max(...allY, ...INIT_Y) + yPad;

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="从单项贡献到完整多项式"
        title="按项展开插值多项式，看到每一个 yₖ·Lₖ(x) 如何叠加"
        summary="这一步不再只看最终曲线，而是把每个基函数项的贡献拆出来。当前项用彩色虚线表示，蓝线表示累计后的插值结果。"
        pills={[`当前步数 ${step}/${n}`, "可逐项播放", "适合讲授公式展开"]}
      />

      <div className="lagrange-focus-grid">
        <PanelCard
          title="分项贡献与累计结果"
          summary="先看灰色节点，再看当前项的贡献曲线和蓝色累计曲线。"
        >
          <svg width={p.w} height={p.h} viewBox={`0 0 ${p.w} ${p.h}`}
            className="lagrange-svg"
            style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
            <Axes p={p} xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}/>
            {Array.from({length:step},(_,k)=>(
              <polyline key={k} points={p.pts(xFine,contributions[k],xMin,xMax,yMin,yMax)}
                fill="none" stroke={PALETTE[k%PALETTE.length]} strokeWidth={1}
                strokeDasharray="4 3" opacity={0.35}/>
            ))}
            {step>0 && (
              <polyline points={p.pts(xFine,contributions[step-1],xMin,xMax,yMin,yMax)}
                fill="none" stroke={PALETTE[(step-1)%PALETTE.length]} strokeWidth={2.2} strokeDasharray="6 3"/>
            )}
            {step>0 && (
              <polyline points={p.pts(xFine,runningSums[step],xMin,xMax,yMin,yMax)}
                fill="none" stroke="#2563eb" strokeWidth={2.8}/>
            )}
            {INIT_X.map((x,i)=>(
              <circle key={i} cx={p.tx(x,xMin,xMax)} cy={p.ty(INIT_Y[i],yMin,yMax)}
                r={6} fill={i<step?PALETTE[i%PALETTE.length]:"#aaa"}
                stroke="#fff" strokeWidth={1.5}/>
            ))}
            {step===0 && (
              <text x={p.w/2} y={p.h/2} textAnchor="middle" fill="#bbb" fontSize={18}>
                拖动滑块开始逐步展示
              </text>
            )}
            {step>0 && (
              <Legend items={[
                {color:PALETTE[(step-1)%PALETTE.length],label:`y${step}·L${step}(x)（当前项）`,dash:"6 3"},
                {color:"#2563eb",label:`P${step}(x)（前${step}项之和）`,width:2.8},
              ]} x={p.pad.left+8} y={p.pad.top+6}/>
            )}
          </svg>
        </PanelCard>

        <div className="lagrange-rail">
          <section className="lagrange-toolbar-card">
            <div className="lagrange-card-head">
              <div>
                <h4>逐步叠加控制</h4>
                <p>用滑块或按钮推进，适合课堂上逐项解释插值公式是怎么长出来的。</p>
              </div>
            </div>
            <div className="lagrange-toolbar">
              <span className="lagrange-inline-stat">
                <span>逐步叠加</span>
                <strong>{step} / {n}</strong>
              </span>
              <input type="range" min={0} max={n} step={1} value={step}
                onChange={e=>setStep(Number(e.target.value))}
                style={{ width:"min(100%, 280px)" }}/>
              <button className="lp-btn" onClick={()=>setStep(0)}>归零</button>
              <button className="lp-btn" onClick={()=>setStep(n)}>全部</button>
              <button className="lp-btn" onClick={()=>setStep(s=>Math.max(0,s-1))}>◀ 上一步</button>
              <button className="lp-btn" onClick={()=>setStep(s=>Math.min(n,s+1))}>下一步 ▶</button>
            </div>
          </section>

          <MetricCard
            label="当前层级"
            value={step === 0 ? "尚未展开" : `第 ${step} 项`}
            hint={step === 0 ? "先从空白开始，再观察每一项如何抬起曲线" : "彩色虚线是当前项，蓝线是累计结果"}
          />

          <div className="lagrange-note">
            <strong>讲解重点：</strong>P(x) = Σ yₖ·Lₖ(x)。这一页最适合解释“为什么最终多项式不是一下子冒出来，而是每一项贡献累加出来的”。
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Node comparison — slider ──────────────────────────────────────────

const SINC_F = x => Math.abs(x)<1e-9 ? 1 : Math.sin(Math.PI*x)/(Math.PI*x);
const NODE_RANGE = [-1, 1];

function NodeTab() {
  const [n, setN] = useState(5);
  const xDense = linspace(NODE_RANGE[0], NODE_RANGE[1], 800);
  const yExact = xDense.map(SINC_F);
  const pFn  = makePlot(620, 220);
  const pErr = makePlot(620, 160, { top:14, right:16, bottom:28, left:50 });

  const xEqui = linspace(NODE_RANGE[0], NODE_RANGE[1], n);
  const yEqui = xEqui.map(SINC_F);
  const xCheb = chebyshevNodes(NODE_RANGE[0], NODE_RANGE[1], n);
  const yCheb = xCheb.map(SINC_F);
  const yEquiInterp = xDense.map(x => lagrangeInterp(xEqui, yEqui, x));
  const yChebInterp = xDense.map(x => lagrangeInterp(xCheb, yCheb, x));
  const errEqui = xDense.map((_,i)=>Math.abs(yEquiInterp[i]-yExact[i]));
  const errCheb = xDense.map((_,i)=>Math.abs(yChebInterp[i]-yExact[i]));
  const allY = [...yExact,...yEquiInterp,...yChebInterp].filter(isFinite);
  const yMin = Math.min(...allY)-0.05, yMax = Math.max(...allY)+0.05;
  const errMax = Math.max(...errEqui,...errCheb,1e-10);
  const errLogMax = Math.ceil(Math.log10(errMax))+0.5;
  const errLogMin = -16;
  const logEqui = errEqui.map(v=>Math.log10(Math.max(v,1e-16)));
  const logCheb = errCheb.map(v=>Math.log10(Math.max(v,1e-16)));
  const equiMaxErr = Math.max(...errEqui.filter(isFinite));
  const chebMaxErr = Math.max(...errCheb.filter(isFinite));

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="sinc 函数节点策略对比"
        title="把函数对比和误差曲线拆成上下两层，先看形状，再看误差"
        summary="这一页用 sinc(x) 做对照。上图看插值曲线有没有偏离，下图直接看对数误差，避免只靠肉眼猜测差异。"
        pills={[`当前节点数 ${n}`, "区间 [−1, 1]", "上下双图联动"]}
      />

      <div className="lagrange-focus-grid">
        <div className="lagrange-plot-stack">
          <PanelCard
            title="函数与插值曲线"
            summary="先看宏观拟合形状，判断两类节点插值是否已经偏离原函数。"
          >
            <svg width={pFn.w} height={pFn.h} viewBox={`0 0 ${pFn.w} ${pFn.h}`}
              className="lagrange-svg"
              style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
              <Axes p={pFn} xMin={NODE_RANGE[0]} xMax={NODE_RANGE[1]} yMin={yMin} yMax={yMax} yLabel="f(x)"/>
              <polyline points={pFn.pts(xDense,yExact,NODE_RANGE[0],NODE_RANGE[1],yMin,yMax)}
                fill="none" stroke="#222" strokeWidth={2}/>
              <polyline points={pFn.pts(xDense,yEquiInterp,NODE_RANGE[0],NODE_RANGE[1],yMin,yMax)}
                fill="none" stroke="#e63946" strokeWidth={2} strokeDasharray="7 3"/>
              <polyline points={pFn.pts(xDense,yChebInterp,NODE_RANGE[0],NODE_RANGE[1],yMin,yMax)}
                fill="none" stroke="#2a9d8f" strokeWidth={2}/>
              {xEqui.map((x,i)=>(
                <circle key={i} cx={pFn.tx(x,NODE_RANGE[0],NODE_RANGE[1])}
                  cy={pFn.ty(yEqui[i],yMin,yMax)} r={4} fill="#e63946" stroke="#fff" strokeWidth={1}/>
              ))}
              {xCheb.map((x,i)=>(
                <rect key={i} x={pFn.tx(x,NODE_RANGE[0],NODE_RANGE[1])-3}
                  y={pFn.ty(yCheb[i],yMin,yMax)-3} width={6} height={6}
                  fill="#2a9d8f" stroke="#fff" strokeWidth={1}/>
              ))}
              <Legend items={[
                {color:"#222",label:"精确函数"},
                {color:"#e63946",label:"等距节点插值",dash:"7 3"},
                {color:"#2a9d8f",label:"切比雪夫节点插值"},
              ]} x={pFn.pad.left+8} y={pFn.pad.top+4}/>
            </svg>
          </PanelCard>

          <PanelCard
            title="误差曲线（对数尺度）"
            summary="下钻到误差层，确认差异主要发生在哪些区间。"
          >
            <svg width={pErr.w} height={pErr.h} viewBox={`0 0 ${pErr.w} ${pErr.h}`}
              className="lagrange-svg"
              style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fafafa" }}>
              <Axes p={pErr} xMin={NODE_RANGE[0]} xMax={NODE_RANGE[1]} yMin={errLogMin} yMax={errLogMax} yLabel="log₁₀|误差|"/>
              <polyline points={pErr.pts(xDense,logEqui,NODE_RANGE[0],NODE_RANGE[1],errLogMin,errLogMax)}
                fill="none" stroke="#e63946" strokeWidth={1.5} strokeDasharray="7 3"/>
              <polyline points={pErr.pts(xDense,logCheb,NODE_RANGE[0],NODE_RANGE[1],errLogMin,errLogMax)}
                fill="none" stroke="#2a9d8f" strokeWidth={1.5}/>
            </svg>
          </PanelCard>
        </div>

        <div className="lagrange-rail">
          <section className="lagrange-toolbar-card">
            <div className="lagrange-card-head">
              <div>
                <h4>节点数控制</h4>
                <p>同一组参数下同时观察函数拟合和误差曲线，判断两种节点策略的稳定性。</p>
              </div>
            </div>
            <div className="lagrange-toolbar">
              <label className="visualizer-slider" style={{ minWidth:240, width:"min(100%, 320px)" }}>
                <div className="visualizer-control-head">
                  <span>节点数 n</span>
                  <strong>{n}</strong>
                </div>
                <input type="range" min={2} max={20} step={1} value={n} title={String(n)}
                  onChange={e => setN(Number(e.target.value))}/>
              </label>
              <button className="lp-btn" onClick={() => setN(s => Math.max(2, s - 1))}>◀ 减少</button>
              <button className="lp-btn" onClick={() => setN(s => Math.min(20, s + 1))}>增加 ▶</button>
              <button className="lp-btn" onClick={() => setN(5)}>重置</button>
            </div>
          </section>

          <div className="lagrange-kpi-grid">
            <MetricCard label="等距节点最大误差" value={equiMaxErr.toExponential(3)} hint="端点附近更容易放大" tone="is-danger" />
            <MetricCard label="切比雪夫节点最大误差" value={chebMaxErr.toExponential(3)} hint="更接近全区间均衡控制" tone="is-safe" />
          </div>

          <div className="lagrange-note">
            <strong>结论：</strong>切比雪夫节点在端点附近更密集，等价于降低插值系统的放大效应，因此误差通常比等距节点更可控。
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Error analysis — Runge phenomenon, equidistant vs Chebyshev ────────

function ErrorTab() {
  const [n, setN] = useState(9);

  const xMin = -5, xMax = 5;
  const xFine = linspace(xMin, xMax, FINE_N);
  const yExact = xFine.map(TEST_F);

  // Equidistant nodes
  const equiX = linspace(xMin, xMax, n);
  const equiY = equiX.map(TEST_F);
  const yEqui = xFine.map(x => lagrangeInterp(equiX, equiY, x));

  // Chebyshev nodes
  const chebX = chebyshevNodes(xMin, xMax, n);
  const chebY = chebX.map(TEST_F);
  const yCheb = xFine.map(x => lagrangeInterp(chebX, chebY, x));

  // Errors
  const errEqui = xFine.map((_, i) => Math.abs(yEqui[i] - yExact[i]));
  const errCheb = xFine.map((_, i) => Math.abs(yCheb[i] - yExact[i]));
  const maxErrEqui = Math.max(...errEqui.filter(isFinite));
  const maxErrCheb = Math.max(...errCheb.filter(isFinite));
  const rmseEqui = Math.sqrt(errEqui.filter(v=>isFinite(v)).reduce((s,v)=>s+v*v,0)/errEqui.filter(v=>isFinite(v)).length);
  const rmseCheb = Math.sqrt(errCheb.filter(v=>isFinite(v)).reduce((s,v)=>s+v*v,0)/errCheb.filter(v=>isFinite(v)).length);

  const errLogMax = Math.ceil(Math.log10(Math.max(maxErrEqui, maxErrCheb, 1e-10))) + 1;
  const errLogMin = -16;
  const errLogEqui = errEqui.map(v => Math.log10(Math.max(v, 1e-16)));
  const errLogCheb = errCheb.map(v => Math.log10(Math.max(v, 1e-16)));

  const yPlotMin = -1.5, yPlotMax = 1.5;
  const pFn  = makePlot(620, 280);
  const pErr = makePlot(620, 200);

  return (
    <div className="lagrange-stage">
      <SectionLead
        kicker="端点振荡的误差视角"
        title="把函数图和误差图拆开看，更容易解释龙格现象的来源"
        summary="这一页专门聚焦误差。上图看插值曲线在哪些区间开始偏离原函数，下图直接看对数误差如何在端点抬升。"
        pills={[`当前节点数 ${n}`, "函数区间 [−5, 5]", "上图看形状，下图看误差"]}
      />

      <div className="lagrange-focus-grid">
        <div className="lagrange-plot-stack">
          <PanelCard
            title="函数与插值对比"
            summary="上图保留了曲线形状对比，并把 y 轴裁剪到更容易看出振荡的区间。"
          >
            <svg width={pFn.w} height={pFn.h} viewBox={`0 0 ${pFn.w} ${pFn.h}`}
              className="lagrange-svg"
              style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
              <defs>
                <clipPath id="err-clip">
                  <rect x={pFn.pad.left} y={pFn.pad.top} width={pFn.pw} height={pFn.ph}/>
                </clipPath>
              </defs>
              <Axes p={pFn} xMin={xMin} xMax={xMax} yMin={yPlotMin} yMax={yPlotMax}/>
              <polyline points={pFn.pts(xFine,yExact,xMin,xMax,yPlotMin,yPlotMax)}
                fill="none" stroke="#222" strokeWidth={2} clipPath="url(#err-clip)"/>
              <polyline points={pFn.pts(xFine,yEqui,xMin,xMax,yPlotMin,yPlotMax)}
                fill="none" stroke="#e63946" strokeWidth={1.8} strokeDasharray="7 3" clipPath="url(#err-clip)"/>
              <polyline points={pFn.pts(xFine,yCheb,xMin,xMax,yPlotMin,yPlotMax)}
                fill="none" stroke="#2a9d8f" strokeWidth={1.8} clipPath="url(#err-clip)"/>
              {equiX.map((x,i)=>(
                <circle key={`eq${i}`} cx={pFn.tx(x,xMin,xMax)} cy={pFn.ty(equiY[i],yPlotMin,yPlotMax)}
                  r={4} fill="#e63946" stroke="#fff" strokeWidth={1.5}/>
              ))}
              {chebX.map((x,i)=>(
                <rect key={`ch${i}`}
                  x={pFn.tx(x,xMin,xMax)-4} y={pFn.ty(chebY[i],yPlotMin,yPlotMax)-4}
                  width={8} height={8} fill="#2a9d8f" stroke="#fff" strokeWidth={1}/>
              ))}
              <Legend items={[
                {color:"#222",  label:"龙格函数 f(x)"},
                {color:"#e63946",label:"等距节点插值", dash:"7 3"},
                {color:"#2a9d8f",label:"切比雪夫节点插值"},
              ]} x={pFn.pad.left+8} y={pFn.pad.top+6}/>
            </svg>
          </PanelCard>

          <PanelCard
            title="误差对比（对数尺度）"
            summary="下图专门看误差级别，适合解释为什么端点附近会最先失控。"
          >
            <svg width={pErr.w} height={pErr.h} viewBox={`0 0 ${pErr.w} ${pErr.h}`}
              className="lagrange-svg"
              style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
              <Axes p={pErr} xMin={xMin} xMax={xMax} yMin={errLogMin} yMax={errLogMax} yLabel="log₁₀|误差|"/>
              <polyline points={pErr.pts(xFine,errLogEqui,xMin,xMax,errLogMin,errLogMax)}
                fill="none" stroke="#e63946" strokeWidth={1.8} strokeDasharray="6 3"/>
              <polyline points={pErr.pts(xFine,errLogCheb,xMin,xMax,errLogMin,errLogMax)}
                fill="none" stroke="#2a9d8f" strokeWidth={1.8}/>
              <Legend items={[
                {color:"#e63946", label:"等距节点误差", dash:"6 3"},
                {color:"#2a9d8f", label:"切比雪夫节点误差"},
              ]} x={pErr.pad.left+8} y={pErr.pad.top+6}/>
            </svg>
          </PanelCard>
        </div>

        <div className="lagrange-rail">
          <section className="lagrange-toolbar-card">
            <div className="lagrange-card-head">
              <div>
                <h4>误差观察控制</h4>
                <p>只保留一个滑块，让注意力集中在节点数变化带来的误差演变上。</p>
              </div>
            </div>
            <div className="lagrange-toolbar">
              <label className="visualizer-slider" style={{ maxWidth:320, width:"100%" }}>
                <div className="visualizer-control-head">
                  <span>节点数 n</span>
                  <strong>{n}</strong>
                </div>
                <input type="range" min={2} max={20} step={1} value={n}
                  onChange={e => setN(Number(e.target.value))}/>
              </label>
            </div>
          </section>

          <div className="lagrange-stats-grid">
            <MetricCard label={`等距节点（n=${n}）`} value={maxErrEqui.toExponential(3)} hint={`RMSE ${rmseEqui.toExponential(3)}`} tone="is-danger" />
            <MetricCard label={`切比雪夫节点（n=${n}）`} value={maxErrCheb.toExponential(3)} hint={`RMSE ${rmseCheb.toExponential(3)}`} tone="is-safe" />
          </div>

          <div className="lagrange-note">
            <strong>结论：</strong>节点数继续增大时，等距节点误差会在端点 x≈±5 附近迅速放大；切比雪夫节点的误差曲线则更平缓，整体仍在收敛。
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id:"main",  label:"主演示", hint:"编辑节点、即时求值、联动误差" },
  { id:"runge", label:"龙格现象", hint:"对比等距节点与切比雪夫节点" },
  { id:"step",  label:"逐步构建", hint:"按项展开 yₖ·Lₖ(x) 的叠加过程" },
  { id:"nodes", label:"节点比较", hint:"上下双图同时看形状与误差" },
  { id:"error", label:"误差分析", hint:"聚焦端点振荡与误差放大机制" },
];

export function LagrangeInteractivePage() {
  const [tab, setTab] = useState("main");
  const [pts, setPts] = useState(() => INIT_X.map((x, i) => ({ x, y: INIT_Y[i] })));
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];
  return (
    <div className="lagrange-page">
      <div className="lagrange-shell">
        <section className="lagrange-hero">
          <div className="lagrange-hero-head">
            <div className="lagrange-hero-copy">
              <span className="lagrange-kicker">内容实验 / 节点 / 曲线 / 误差</span>
              <h2>把拉格朗日插值的 5 个核心视角收成一页实验台</h2>
              <p>不再只是把图和滑块摆出来，而是把主演示、龙格现象、逐步构建、节点比较和误差分析整理成一套连贯的内容页结构，便于讲授和自学切换。</p>
            </div>
            <div className="lagrange-hero-meta">
              <div className="lagrange-meta-card">
                <span>当前视角</span>
                <strong>{activeTab.label}</strong>
                <small>{activeTab.hint}</small>
              </div>
              <div className="lagrange-meta-card">
                <span>实验模块</span>
                <strong>5 个选项卡</strong>
                <small>从节点编辑一直覆盖到误差与稳定性分析。</small>
              </div>
              <div className="lagrange-meta-card">
                <span>当前节点</span>
                <strong>{pts.length} 个插值点</strong>
                <small>主演示中的节点编辑会持续保留，便于反复比较。</small>
              </div>
            </div>
          </div>
        </section>

        <div className="lagrange-tabs" role="tablist" aria-label="拉格朗日插值内容切换">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`lagrange-tab${tab===t.id?" active":""}`}
              onClick={()=>setTab(t.id)}
              role="tab"
              aria-selected={tab === t.id}
            >
              <strong>{t.label}</strong>
              <span>{t.hint}</span>
            </button>
          ))}
        </div>

        {tab==="main"  && <MainTab pts={pts} setPts={setPts}/>}
        {tab==="runge" && <RungeTab/>}
        {tab==="step"  && <StepTab/>}
        {tab==="nodes" && <NodeTab/>}
        {tab==="error" && <ErrorTab/>}
      </div>
    </div>
  );
}
