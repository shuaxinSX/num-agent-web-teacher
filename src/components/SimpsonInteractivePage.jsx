import { useEffect, useMemo, useState } from "react";
import {
  compileExpression,
  formatExpressionAsLatex,
  formatMetric,
  parseDirectedInterval
} from "../utils/numericalMethods";
import { MathFormula } from "./MathFormula";
import { LessonControlBar } from "./LessonControlBar";
import { greatWallProfile } from "../data/greatWallProfile";
import {
  buildNodeSamples,
  buildPlotGeometry,
  renderCurveFill,
  buildSimpsonUnitShapes,
  buildSvgPath,
  buildTrapezoidShapes,
  clamp,
  formatRatio,
  improvementRatio,
  referenceIntegral,
  renderShapePath,
  simpsonRule,
  trapezoidRule
} from "../utils/lessonMath";
import { useLessonKeyboardShortcuts, useLessonPlayback } from "../utils/useLessonPlayback";

const STAGES = [
  {
    id: "arc",
    label: "阶段 1",
    title: "三点确定一段抛物线",
    questionId: "q3"
  },
  {
    id: "weights",
    label: "阶段 2",
    title: "复合辛普森权重",
    questionId: "q3"
  },
  {
    id: "showdown",
    label: "阶段 3",
    title: "与梯形同采样点比较",
    questionId: "q3"
  },
  {
    id: "smoothness",
    label: "阶段 4",
    title: "平滑性与误差阶",
    questionId: "q3"
  }
];

const QUESTION_CHAIN = [
  {
    id: "q1",
    question: "最简单怎样估面积？",
    answer: "矩形近似",
    featureId: "trapezoid",
    stageId: "intro"
  },
  {
    id: "q2",
    question: "矩形太粗糙怎么办？",
    answer: "梯形",
    featureId: "trapezoid",
    stageId: "assembly"
  },
  {
    id: "q3",
    question: "怎样更贴合弯曲曲线？",
    answer: "辛普森",
    featureId: "simpson",
    stageId: "arc"
  },
  {
    id: "q4",
    question: "能否复用已有结果继续提速？",
    answer: "Romberg",
    featureId: "trapezoid",
    stageId: "romberg"
  },
  {
    id: "q5",
    question: "阶数越高一定越好吗？",
    answer: "高阶反转",
    featureId: "newton-cotes",
    stageId: "challenge"
  }
];

const CHART = {
  width: 960,
  height: 500,
  margin: { top: 28, right: 28, bottom: 52, left: 60 }
};

const PRESETS = [
  { id: "sin", label: "正弦半波", expression: "sin(x)", a: "0", b: "pi" },
  { id: "gauss", label: "高斯钟形", expression: "exp(-x^2)", a: "0", b: "1" },
  { id: "cubic", label: "三次多项式", expression: "x^3 + x + 1", a: "0", b: "1" },
  { id: "cusp", label: "尖点函数", expression: "abs(x)", a: "-1", b: "1" }
];

const ARC_STEPS = [
  "只看曲线",
  "先出现端点连线",
  "加入中点",
  "长出抛物线"
];

function StageTabs({ stage, onChange }) {
  return (
    <div className="lesson-stage-tabs">
      {STAGES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === stage ? "lesson-stage-tab is-active" : "lesson-stage-tab"}
          onClick={() => onChange(item.id)}
        >
          <span>{item.label}</span>
          <strong>{item.title}</strong>
        </button>
      ))}
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <article className={tone ? `lesson-metric-card ${tone}` : "lesson-metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function renderAxes(geometry) {
  return (
    <>
      <line
        x1={geometry.margin.left}
        x2={geometry.margin.left + geometry.plotWidth}
        y1={geometry.sy(0)}
        y2={geometry.sy(0)}
        className="lesson-axis-line"
      />
      <line
        x1={geometry.margin.left}
        x2={geometry.margin.left}
        y1={geometry.margin.top}
        y2={geometry.margin.top + geometry.plotHeight}
        className="lesson-axis-line lesson-axis-line-light"
      />
    </>
  );
}

function buildCustomFunctionCase(expression, aText, bText) {
  const fn = compileExpression(expression);
  const interval = parseDirectedInterval(aText, bText);

  return {
    expression,
    fn,
    a: interval.start,
    b: interval.end,
    reference: referenceIntegral(fn, interval.start, interval.end, 8192)
  };
}

function safeLatex(expression) {
  try {
    return formatExpressionAsLatex(expression || "x");
  } catch (_error) {
    return "x";
  }
}

export function SimpsonInteractivePage({
  globalExpr,
  globalA,
  globalB,
  onGlobalChange,
  requestedStage
}) {
  const [stage, setStage] = useState("arc");
  const [lessonN, setLessonN] = useState(8);
  const [labOpen, setLabOpen] = useState(false);
  const [labExpr, setLabExpr] = useState(globalExpr || "sin(x)");
  const [labA, setLabA] = useState(globalA || "0");
  const [labB, setLabB] = useState(globalB || "pi");
  const [labN, setLabN] = useState(8);
  const activeStage = STAGES.find((item) => item.id === stage) ?? STAGES[0];

  useEffect(() => {
    if (requestedStage && STAGES.some((item) => item.id === requestedStage)) {
      setStage(requestedStage);
    }
  }, [requestedStage]);

  useEffect(() => {
    setLabExpr(globalExpr || "sin(x)");
    setLabA(globalA || "0");
    setLabB(globalB || "pi");
  }, [globalA, globalB, globalExpr]);

  const lessonFn = greatWallProfile.evaluate;
  const [a, b] = greatWallProfile.domain;
  const reference = greatWallProfile.integralReference();
  const geometry = useMemo(
    () => buildPlotGeometry(lessonFn, a, b, CHART),
    [a, b, lessonFn]
  );
  const curvePath = useMemo(
    () => buildSvgPath(geometry.curve, geometry.sx, geometry.sy),
    [geometry]
  );

  const frameCount = useMemo(() => {
    if (stage === "arc") {
      return 4;
    }
    if (stage === "weights") {
      return lessonN + 1;
    }
    if (stage === "showdown") {
      return lessonN / 2;
    }
    return 3;
  }, [lessonN, stage]);

  const playback = useLessonPlayback({
    frameCount,
    resetKey: `${stage}:${lessonN}`
  });

  useLessonKeyboardShortcuts({
    onTogglePlay: () => playback.setIsPlaying((previous) => !previous),
    onPrev: playback.goPrev,
    onNext: playback.goNext
  });

  const nodes = useMemo(
    () => buildNodeSamples(lessonFn, a, b, lessonN),
    [a, b, lessonFn, lessonN]
  );
  const trapezoids = useMemo(
    () => buildTrapezoidShapes(lessonFn, a, b, lessonN),
    [a, b, lessonFn, lessonN]
  );
  const simpsonUnits = useMemo(
    () => buildSimpsonUnitShapes(lessonFn, a, b, lessonN),
    [a, b, lessonFn, lessonN]
  );

  const focusUnit = simpsonUnits[Math.floor(simpsonUnits.length / 2)];
  const focusBandLeft = geometry.sx(focusUnit.x0);
  const focusBandWidth = geometry.sx(focusUnit.x2) - geometry.sx(focusUnit.x0);

  const localGeometry = buildPlotGeometry(lessonFn, focusUnit.x0, focusUnit.x2, {
    width: 340,
    height: 220,
    margin: { top: 22, right: 18, bottom: 26, left: 34 },
    xPaddingRatio: 0.1
  });
  const localCurvePath = buildSvgPath(localGeometry.curve, localGeometry.sx, localGeometry.sy);
  const localSecantPath = buildSvgPath(
    [
      { x: focusUnit.x0, y: focusUnit.y0 },
      { x: focusUnit.x2, y: focusUnit.y2 }
    ],
    localGeometry.sx,
    localGeometry.sy
  );
  const localParabolaPath = buildSvgPath(
    focusUnit.curvePoints,
    localGeometry.sx,
    localGeometry.sy
  );

  const weightVisibleCount = clamp(playback.frameIndex + 1, 1, lessonN + 1);
  const showdownFocusUnit = clamp(playback.frameIndex, 0, simpsonUnits.length - 1);
  const smoothCases = [
    {
      id: "wall",
      label: "秦长城轮廓",
      fn: lessonFn,
      a,
      b,
      reference,
      note: "秦长城轮廓主要承担视觉直观；若要严格验证 O(h^4) 误差公式，更适合切到解析光滑 benchmark。"
    },
    {
      id: "sin",
      label: "正弦半波 sin(x)",
      fn: (x) => Math.sin(x),
      a: 0,
      b: Math.PI,
      reference: 2,
      note: "这是更适合承载理论口径的光滑 benchmark，便于说明步长减半时误差如何接近 1/16。"
    },
    {
      id: "cusp",
      label: "尖点函数 |x|",
      fn: (x) => Math.abs(x),
      a: -1,
      b: 1,
      reference: 1,
      note: "当函数不够光滑时，四阶理论优势会明显打折，这时要提醒学生理论前提。"
    }
  ];
  const smoothFocus = smoothCases[playback.frameIndex] || smoothCases[0];
  const smoothGeometry = buildPlotGeometry(smoothFocus.fn, smoothFocus.a, smoothFocus.b, CHART);
  const smoothCurvePath = buildSvgPath(smoothGeometry.curve, smoothGeometry.sx, smoothGeometry.sy);
  const smoothUnits = buildSimpsonUnitShapes(smoothFocus.fn, smoothFocus.a, smoothFocus.b, lessonN);
  const smoothApprox = simpsonRule(smoothFocus.fn, smoothFocus.a, smoothFocus.b, lessonN);
  const smoothError = Math.abs(smoothFocus.reference - smoothApprox);
  const smoothRefinedN = lessonN * 2;
  const smoothRefinedError = Math.abs(
    smoothFocus.reference - simpsonRule(smoothFocus.fn, smoothFocus.a, smoothFocus.b, smoothRefinedN)
  );
  const smoothHalvingRatio = improvementRatio(smoothError, smoothRefinedError);

  const trapApprox = trapezoidRule(lessonFn, a, b, lessonN);
  const simpsonApprox = simpsonRule(lessonFn, a, b, lessonN);
  const trapError = Math.abs(reference - trapApprox);
  const simpsonError = Math.abs(reference - simpsonApprox);
  const showdownGain = improvementRatio(trapError, simpsonError);

  const labResult = useMemo(() => {
    try {
      const customCase = buildCustomFunctionCase(labExpr, labA, labB);
      return {
        ...customCase,
        simpsonApproximation: simpsonRule(customCase.fn, customCase.a, customCase.b, labN),
        trapezoidApproximation: trapezoidRule(customCase.fn, customCase.a, customCase.b, labN)
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "表达式无法解析。"
      };
    }
  }, [labA, labB, labExpr, labN]);


  let stageBody = null;

  if (stage === "arc") {
    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <div className="lesson-card-head">
              <h3>{ARC_STEPS[playback.frameIndex]}</h3>
            </div>

            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />

              <rect
                x={focusBandLeft}
                y={geometry.margin.top + 12}
                width={focusBandWidth}
                height={geometry.plotHeight - 24}
                className="lesson-focus-band"
              />

              {playback.frameIndex >= 2 &&
                [focusUnit.x0, focusUnit.x1, focusUnit.x2].map((x, index) => (
                  <circle
                    key={`arc-node-${index}`}
                    cx={geometry.sx(x)}
                    cy={geometry.sy([focusUnit.y0, focusUnit.y1, focusUnit.y2][index])}
                    r="5"
                    className="lesson-node is-active"
                  />
                ))}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <section className="lesson-side-card">
            <svg viewBox={`0 0 ${localGeometry.width} ${localGeometry.height}`} className="lesson-mini-chart">
              <rect x="0" y="0" width={localGeometry.width} height={localGeometry.height} rx="18" fill="#f8fbf7" />
              {renderAxes(localGeometry)}
              <path d={localCurvePath} className="lesson-curve-path" />
              {playback.frameIndex >= 1 ? (
                <path d={localSecantPath} className="lesson-highlight-line lesson-highlight-line-blue" />
              ) : null}
              {playback.frameIndex >= 3 ? (
                <path d={localParabolaPath} className="lesson-highlight-line lesson-highlight-line-pink" />
              ) : null}
            </svg>
          </section>

          <section className="lesson-side-card">
            <MathFormula
              latex={String.raw`\int_{x_0}^{x_2} f(x)\,\mathrm{d}x \approx \frac{h}{3}\left(f(x_0)+4f(x_1)+f(x_2)\right)`}
            />
            <div className="lesson-metric-strip">
              <div><span>三点</span><strong>端点 + 中点</strong></div>
              <div><span>插值次数</span><strong>2</strong></div>
              <div><span>代数精度</span><strong>3</strong></div>
              <div><span>全局误差阶</span><strong className="is-emphasis">O(h^4)</strong></div>
            </div>
          </section>
        </aside>
      </div>
    );
  } else if (stage === "weights") {

    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />

              {nodes.slice(0, weightVisibleCount).map((node) => {
                const isEndpoint = node.index === 0 || node.index === lessonN;
                const isOdd = !isEndpoint && node.index % 2 === 1;
                return (
                  <circle
                    key={`weight-node-${node.index}`}
                    cx={geometry.sx(node.x)}
                    cy={geometry.sy(node.y)}
                    r={isOdd ? 7 : isEndpoint ? 6 : 5}
                    className={
                      isOdd
                        ? "lesson-node is-weight-4"
                        : isEndpoint
                          ? "lesson-node is-weight-1"
                          : "lesson-node is-weight-2"
                    }
                  />
                );
              })}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <section className="lesson-side-card">
            <MathFormula
              latex={String.raw`S_N = \frac{h}{3}\left[f(x_0)+f(x_N)+4\sum_{\substack{1\le i\le N-1\\ i\text{ 为奇}}}f(x_i)+2\sum_{\substack{2\le i\le N-2\\ i\text{ 为偶}}}f(x_i)\right]`}
            />
          </section>

          <div className="lesson-weight-grid">
            {nodes.map((node) => {
              const isVisible = node.index < weightVisibleCount;
              const weight =
                node.index === 0 || node.index === lessonN ? 1 : node.index % 2 === 1 ? 4 : 2;
              return (
                <div
                  key={`weight-chip-${node.index}`}
                  className={isVisible ? "lesson-weight-chip is-visible" : "lesson-weight-chip"}
                >
                  <strong>{`x_${node.index}`}</strong>
                  <span>{isVisible ? weight : "…"}</span>
                </div>
              );
            })}
          </div>

          <div className="lesson-metric-grid">
            <MetricCard label="当前偶数总子区间 N" value={`${lessonN}`} />
            <MetricCard label="同一节点预算" value={`${lessonN + 1} 个采样点`} tone="is-emphasis" />
          </div>
        </aside>
      </div>
    );
  } else if (stage === "showdown") {
    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <div className="lesson-dual-card-grid">
            <article className="lesson-main-card">
              <div className="lesson-card-head">
                <h3>梯形</h3>
              </div>
              <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart lesson-chart-compact">
                <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
                {renderAxes(geometry)}
                <path d={curvePath} className="lesson-curve-path" />
                {trapezoids.map((shape) => (
                  <path
                    key={`showdown-trap-${shape.index}`}
                    d={renderShapePath(shape, geometry.sx, geometry.sy)}
                    className={
                      Math.floor(shape.index / 2) === showdownFocusUnit
                        ? "lesson-shape lesson-shape-trap is-active"
                        : "lesson-shape lesson-shape-trap"
                    }
                  />
                ))}
              </svg>
            </article>

            <article className="lesson-main-card">
              <div className="lesson-card-head">
                <h3>辛普森</h3>
              </div>
              <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart lesson-chart-compact">
                <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
                {renderAxes(geometry)}
                <path d={curvePath} className="lesson-curve-path" />
                {simpsonUnits.map((unit) => (
                  <path
                    key={`showdown-simpson-${unit.unitIndex}`}
                    d={`${buildSvgPath(unit.curvePoints, geometry.sx, geometry.sy)}`}
                    className={
                      unit.unitIndex === showdownFocusUnit
                        ? "lesson-highlight-line lesson-highlight-line-pink"
                        : "lesson-highlight-line lesson-highlight-line-pink is-soft"
                    }
                  />
                ))}
                {nodes.map((node) => (
                  <circle
                    key={`showdown-node-${node.index}`}
                    cx={geometry.sx(node.x)}
                    cy={geometry.sy(node.y)}
                    r="4.5"
                    className="lesson-node"
                  />
                ))}
              </svg>
            </article>
          </div>
        </section>

        <aside className="lesson-side-column">
          <section className="lesson-side-card">
            <MathFormula latex={String.raw`I - S_N = -\frac{b-a}{180}h^4 f^{(4)}(\xi)`} />
            <div className="lesson-metric-grid">
              <MetricCard label="梯形绝对误差" value={formatMetric(trapError)} />
              <MetricCard label="辛普森绝对误差" value={formatMetric(simpsonError)} tone="is-emphasis" />
              <MetricCard label="同采样点误差优势" value={formatRatio(showdownGain)} />
              <MetricCard label="高精参考值" value={formatMetric(reference)} />
            </div>
          </section>
        </aside>
      </div>
    );
  } else {
    stageBody = (
      <div className="lesson-stage-shell">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <div className="lesson-card-head">
              <h3>{smoothFocus.label}</h3>
            </div>

            <svg viewBox={`0 0 ${smoothGeometry.width} ${smoothGeometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={smoothGeometry.width} height={smoothGeometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(smoothGeometry)}
              <path d={smoothCurvePath} className="lesson-curve-path" />
              {smoothUnits.map((unit) => (
                <g key={`smooth-unit-${unit.unitIndex}`}>
                  <path
                    d={renderCurveFill(unit.curvePoints, smoothGeometry.sx, smoothGeometry.sy)}
                    className="lesson-shape lesson-shape-trap"
                  />
                  <path
                    d={buildSvgPath(unit.curvePoints, smoothGeometry.sx, smoothGeometry.sy)}
                    className="lesson-highlight-line lesson-highlight-line-pink is-soft"
                  />
                </g>
              ))}
              {smoothUnits.flatMap((unit) => [unit.x0, unit.x1, unit.x2].map((x, index) => ({
                key: `${unit.unitIndex}-${index}`,
                x,
                y: [unit.y0, unit.y1, unit.y2][index]
              }))).map((node) => (
                <circle
                  key={`smooth-node-${node.key}`}
                  cx={smoothGeometry.sx(node.x)}
                  cy={smoothGeometry.sy(node.y)}
                  r="4.5"
                  className="lesson-node"
                />
              ))}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <div className="lesson-metric-grid">
            <MetricCard label="当前近似值" value={formatMetric(smoothApprox)} />
            <MetricCard label="高精参考值" value={formatMetric(smoothFocus.reference)} />
            <MetricCard label="绝对误差" value={formatMetric(smoothError)} tone="is-emphasis" />
            <MetricCard
              label="步长减半时 E_N / E_{2N}"
              value={formatRatio(smoothHalvingRatio)}
            />
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="lesson-page lesson-page--stacked">
      <section className="lesson-hero">
        <div>
          <span className="lesson-hero-kicker">guided lab / quadratic rule</span>
          <h2>辛普森法实验台</h2>
          <p>把三点二次插值、1-4-1 权重、同采样点对比和光滑性前提拆成阶段，避免公式与图像割裂。</p>
        </div>
        <div className="lesson-hero-badges">
          <span>{`${activeStage.label} / ${activeStage.title}`}</span>
          <span>{`偶数 N = ${lessonN}`}</span>
          <span>播放 / 单步 / 拖动进度</span>
        </div>
      </section>

      <section className="lesson-workbench-card">
        <StageTabs stage={stage} onChange={setStage} />

        <LessonControlBar
          isPlaying={playback.isPlaying}
          onTogglePlay={() => playback.setIsPlaying((previous) => !previous)}
          onReset={playback.reset}
          onPrev={playback.goPrev}
          onNext={playback.goNext}
          progress={playback.progress}
          onProgressChange={playback.setProgress}
          speed={playback.speed}
          onSpeedChange={playback.setSpeed}
          n={lessonN}
          nLabel="总子区间数 N（偶数）"
          nMin={2}
          nMax={24}
          nStep={2}
          onNChange={(value) => setLessonN(value % 2 === 0 ? value : value + 1)}
        />

        {stageBody}
      </section>

      <details
        className="lesson-lab"
        open={labOpen}
        onToggle={(event) => setLabOpen(event.currentTarget.open)}
      >
        <summary>实验</summary>

        <div className="lesson-lab-grid">
          <section className="lesson-side-card">
            <div className="lesson-form-grid">
              <label>
                <span>f(x)</span>
                <input
                  value={labExpr}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLabExpr(value);
                    onGlobalChange?.(value, labA, labB);
                  }}
                />
              </label>
              <label>
                <span>a</span>
                <input
                  value={labA}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLabA(value);
                    onGlobalChange?.(labExpr, value, labB);
                  }}
                />
              </label>
              <label>
                <span>b</span>
                <input
                  value={labB}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLabB(value);
                    onGlobalChange?.(labExpr, labA, value);
                  }}
                />
              </label>
            </div>

            <div className="lesson-chip-row">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="lesson-chip"
                  onClick={() => {
                    setLabExpr(preset.expression);
                    setLabA(preset.a);
                    setLabB(preset.b);
                    onGlobalChange?.(preset.expression, preset.a, preset.b);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <MathFormula latex={safeLatex(labExpr)} />
          </section>

          <section className="lesson-side-card">
            <label className="lesson-form-inline">
              <span>总子区间数 N（偶数）</span>
              <input
                type="range"
                min="2"
                max="32"
                step="2"
                value={labN}
                onChange={(event) => setLabN(Number(event.target.value))}
              />
              <strong>{labN}</strong>
            </label>
          </section>

          <section className="lesson-side-card">
            {"error" in labResult ? (
              <p className="lesson-inline-copy">{labResult.error}</p>
            ) : (
              <>
                <div className="lesson-metric-grid">
                  <MetricCard
                    label="辛普森近似"
                    value={formatMetric(labResult.simpsonApproximation)}
                    tone="is-emphasis"
                  />
                  <MetricCard label="梯形近似" value={formatMetric(labResult.trapezoidApproximation)} />
                  <MetricCard label="高精参考值" value={formatMetric(labResult.reference)} />
                  <MetricCard
                    label="辛普森绝对误差"
                    value={formatMetric(Math.abs(labResult.reference - labResult.simpsonApproximation))}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </details>
    </div>
  );
}
