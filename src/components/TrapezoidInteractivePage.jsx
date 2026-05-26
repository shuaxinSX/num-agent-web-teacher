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
  buildGapPolygon,
  buildNodeSamples,
  buildPlotGeometry,
  buildRectangleShapes,
  buildSvgPath,
  buildTrapezoidShapes,
  clamp,
  computePartialTrapezoidAssembly,
  flattenRombergSteps,
  formatRatio,
  improvementRatio,
  referenceIntegral,
  renderShapePath,
  rombergTable,
  trapezoidRule,
  leftRectangleRule
} from "../utils/lessonMath";
import { useLessonKeyboardShortcuts, useLessonPlayback } from "../utils/useLessonPlayback";

const STAGES = [
  {
    id: "intro",
    label: "阶段 1",
    title: "矩形与梯形",
    questionId: "q1"
  },
  {
    id: "assembly",
    label: "阶段 2",
    title: "复合梯形公式",
    questionId: "q2"
  },
  {
    id: "error",
    label: "阶段 3",
    title: "误差与曲率",
    questionId: "q2"
  },
  {
    id: "romberg",
    label: "阶段 4",
    title: "Romberg 外推",
    questionId: "q4"
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
    answer: "梯形与误差直觉",
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

const VIEW_MODES = [
  { id: "left", label: "只看矩形" },
  { id: "transition", label: "矩形→梯形过渡" },
  { id: "trapezoid", label: "只看梯形" }
];

const PRESETS = [
  { id: "great-wall", label: "秦长城", expression: "sin(x)", a: "0", b: "pi" },
  { id: "sin-wave", label: "正弦半波", expression: "sin(x)", a: "0", b: "pi" },
  { id: "gauss", label: "高斯钟形", expression: "exp(-x^2)", a: "0", b: "1" },
  { id: "rational", label: "有理函数", expression: "1/(1+x^2)", a: "0", b: "1" }
];

const CHART = {
  width: 960,
  height: 500,
  margin: { top: 28, right: 28, bottom: 52, left: 60 }
};

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
    return "";
  }
}

export function TrapezoidInteractivePage({
  globalExpr,
  globalA,
  globalB,
  onGlobalChange,
  requestedStage
}) {
  const [stage, setStage] = useState("intro");
  const [viewMode, setViewMode] = useState("transition");
  const [lessonN, setLessonN] = useState(8);
  const [rombergDepth, setRombergDepth] = useState(4);
  const [labOpen, setLabOpen] = useState(false);
  const [labMode, setLabMode] = useState("composite");
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

  const stageFrameCount = useMemo(() => {
    if (stage === "intro") {
      return lessonN + 3;
    }
    if (stage === "assembly") {
      return lessonN;
    }
    if (stage === "error") {
      return lessonN;
    }
    const steps = flattenRombergSteps(rombergTable(lessonFn, a, b, rombergDepth));
    return steps.length;
  }, [a, b, lessonFn, lessonN, rombergDepth, stage]);

  const playback = useLessonPlayback({
    frameCount: stageFrameCount,
    resetKey: `${stage}:${stage === "romberg" ? rombergDepth : lessonN}`
  });

  useLessonKeyboardShortcuts({
    onTogglePlay: () => playback.setIsPlaying((previous) => !previous),
    onPrev: playback.goPrev,
    onNext: playback.goNext
  });

  const introRectangles = useMemo(
    () => buildRectangleShapes(lessonFn, a, b, lessonN, "left"),
    [a, b, lessonFn, lessonN]
  );
  const introTrapezoids = useMemo(
    () => buildTrapezoidShapes(lessonFn, a, b, lessonN),
    [a, b, lessonFn, lessonN]
  );
  const introNodes = useMemo(
    () => buildNodeSamples(lessonFn, a, b, lessonN),
    [a, b, lessonFn, lessonN]
  );

  const labResult = useMemo(() => {
    try {
      const customCase = buildCustomFunctionCase(labExpr, labA, labB);
      if (labMode === "basic") {
        const approximation =
          0.5 * (customCase.b - customCase.a) * (customCase.fn(customCase.a) + customCase.fn(customCase.b));
        return {
          ...customCase,
          approximation,
          extra: "单区间梯形"
        };
      }

      if (labMode === "romberg") {
        const table = rombergTable(customCase.fn, customCase.a, customCase.b, clamp(labN, 2, 6));
        const best = table[table.length - 1][table.length - 1].value;
        return {
          ...customCase,
          approximation: best,
          extra: `Romberg 深度 ${clamp(labN, 2, 6)}`
        };
      }

        return {
          ...customCase,
          approximation: trapezoidRule(customCase.fn, customCase.a, customCase.b, labN),
          extra: `复合梯形 N=${labN}`
        };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "表达式无法解析。"
      };
    }
  }, [labA, labB, labExpr, labMode, labN]);

  const introFrame = playback.frameIndex;
  const introNodesVisible = introFrame >= 1;
  const introRevealCount = clamp(introFrame - 1, 0, lessonN);
  const introMorphReady = introFrame >= lessonN + 2;
  const introLeftValue = leftRectangleRule(lessonFn, a, b, lessonN);
  const introTrapValue = trapezoidRule(lessonFn, a, b, lessonN);
  const introFocusUnit = Math.min(Math.floor(lessonN * 0.35), lessonN - 1);
  const introFocus = introTrapezoids[introFocusUnit];

  const assemblyCount = clamp(playback.frameIndex + 1, 1, lessonN);
  const assemblyState = computePartialTrapezoidAssembly(lessonFn, a, b, lessonN, assemblyCount);
  const assemblyActiveUnit = assemblyCount - 1;
  const assemblyFocus = introTrapezoids[assemblyActiveUnit];

  const errorFocusIndex = clamp(playback.frameIndex, 0, lessonN - 1);
  const errorFocus = introTrapezoids[errorFocusIndex];
  const errorSecant = (x) =>
    errorFocus.y0 + ((errorFocus.y1 - errorFocus.y0) * (x - errorFocus.x0)) / (errorFocus.x1 - errorFocus.x0);
  const errorGap = buildGapPolygon(lessonFn, errorSecant, errorFocus.x0, errorFocus.x1);
  const localExact = referenceIntegral(lessonFn, errorFocus.x0, errorFocus.x1, 2048);
  const localTrap = 0.5 * (errorFocus.x1 - errorFocus.x0) * (errorFocus.y0 + errorFocus.y1);
  const localError = localExact - localTrap;
  const localEquivalentCurvature =
    errorFocus.x1 === errorFocus.x0
      ? 0
      : (-12 * localError) / (errorFocus.x1 - errorFocus.x0) ** 3;
  const globalApprox = trapezoidRule(lessonFn, a, b, lessonN);
  const globalError = Math.abs(reference - globalApprox);
  const refinedN = lessonN * 2;
  const refinedError = Math.abs(reference - trapezoidRule(lessonFn, a, b, refinedN));
  const halvingRatio = improvementRatio(globalError, refinedError);

  const rombergRows = useMemo(
    () => rombergTable(lessonFn, a, b, rombergDepth),
    [a, b, lessonFn, rombergDepth]
  );
  const rombergSteps = useMemo(() => flattenRombergSteps(rombergRows), [rombergRows]);
  const rombergStep = rombergSteps[playback.frameIndex] || rombergSteps[rombergSteps.length - 1];
  const visibleStepKeys = new Set(
    rombergSteps.slice(0, playback.frameIndex + 1).map((item) => `${item.row}-${item.col}`)
  );
  const rombergLookup = new Map(
    rombergSteps.map((item, index) => [`${item.row}-${item.col}`, index])
  );
  const rombergCurrentN = 2 ** rombergStep.row;
  const rombergShapes = buildTrapezoidShapes(lessonFn, a, b, rombergCurrentN);
  const rombergNodes = buildNodeSamples(lessonFn, a, b, rombergCurrentN);
  const oldNodeSet = new Set(
    rombergStep.row === 0
      ? []
      : buildNodeSamples(lessonFn, a, b, 2 ** (rombergStep.row - 1)).map((node) => node.x.toFixed(6))
  );

  let stageBody = null;

  if (stage === "intro") {
    const focusZoom = buildPlotGeometry(lessonFn, introFocus.x0, introFocus.x1, {
      width: 320,
      height: 180,
      margin: { top: 20, right: 18, bottom: 24, left: 30 },
      xPaddingRatio: 0.1
    });
    const focusCurvePath = buildSvgPath(focusZoom.curve, focusZoom.sx, focusZoom.sy);
    const focusLinePath = buildSvgPath(
      [
        { x: introFocus.x0, y: introFocus.y0 },
        { x: introFocus.x1, y: introFocus.y1 }
      ],
      focusZoom.sx,
      focusZoom.sy
    );

    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />

              {introRevealCount > 0 &&
                introRectangles.slice(0, introRevealCount).map((shape) => (
                  <path
                    key={`rect-${shape.index}`}
                    d={renderShapePath(shape, geometry.sx, geometry.sy)}
                    className="lesson-shape lesson-shape-rect"
                  />
                ))}

              {introMorphReady &&
                introTrapezoids.map((shape) => (
                  <path
                    key={`trap-${shape.index}`}
                    d={renderShapePath(shape, geometry.sx, geometry.sy)}
                    className="lesson-shape lesson-shape-trap"
                  />
                ))}

              {introNodesVisible &&
                introNodes.map((node) => (
                  <circle
                    key={node.index}
                    cx={geometry.sx(node.x)}
                    cy={geometry.sy(node.y)}
                    r="4.5"
                    className="lesson-node"
                  />
                ))}

              <rect
                x={geometry.sx(introFocus.x0)}
                y={geometry.margin.top + 12}
                width={geometry.sx(introFocus.x1) - geometry.sx(introFocus.x0)}
                height={geometry.plotHeight - 24}
                className="lesson-focus-band"
              />
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
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
            n={n}
            onNChange={setN}
          />
          <section className="lesson-side-card">
            <MathFormula latex={String.raw`L_N = h\sum_{i=0}^{N-1} f(x_i),\quad h=\frac{b-a}{N}`} />
            <MathFormula
              latex={String.raw`T_N = h\left[\frac{f(x_0)}{2}+\sum_{i=1}^{N-1}f(x_i)+\frac{f(x_N)}{2}\right]`}
            />
          </section>

          <div className="lesson-metric-grid">
            <MetricCard label="左矩形近似" value={formatMetric(introLeftValue)} />
            <MetricCard label="梯形近似" value={formatMetric(introTrapValue)} />
            <MetricCard label="高精参考值" value={formatMetric(reference)} />
            <MetricCard
              label="梯形绝对误差"
              value={formatMetric(Math.abs(reference - introTrapValue))}
              tone="is-emphasis"
            />
          </div>

          <section className="lesson-side-card">
            <svg viewBox={`0 0 ${focusZoom.width} ${focusZoom.height}`} className="lesson-mini-chart">
              <rect x="0" y="0" width={focusZoom.width} height={focusZoom.height} rx="18" fill="#f8fbf7" />
              {renderAxes(focusZoom)}
              <path d={focusCurvePath} className="lesson-curve-path" />
              <path d={focusLinePath} className="lesson-highlight-line" />
            </svg>
          </section>
        </aside>
      </div>
    );
  } else if (stage === "assembly") {
    const currentContribution =
      0.5 * assemblyState.step * (lessonFn(assemblyFocus.x0) + lessonFn(assemblyFocus.x1));

    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />

              {introTrapezoids.slice(0, assemblyCount).map((shape) => (
                <path
                  key={`assembly-${shape.index}`}
                  d={renderShapePath(shape, geometry.sx, geometry.sy)}
                  className={
                    shape.index === assemblyActiveUnit
                      ? "lesson-shape lesson-shape-trap is-active"
                      : "lesson-shape lesson-shape-trap"
                  }
                />
              ))}

              {introNodes.map((node) => {
                const weight = assemblyState.weights[node.index];
                return (
                  <circle
                    key={`assembly-node-${node.index}`}
                    cx={geometry.sx(node.x)}
                    cy={geometry.sy(node.y)}
                    r={weight > 0.75 ? 7 : weight > 0 ? 5.5 : 4}
                    className={
                      node.index === assemblyActiveUnit || node.index === assemblyActiveUnit + 1
                        ? "lesson-node is-active"
                        : weight > 0
                          ? "lesson-node is-visible"
                          : "lesson-node"
                    }
                  />
                );
              })}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
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
            n={n}
            onNChange={setN}
          />
          <section className="lesson-side-card">
            <div className="lesson-highlight-stat">
              <strong>{assemblyCount}</strong>
              <span>/ {lessonN} 个小梯形</span>
            </div>
          </section>

          <section className="lesson-side-card">
            <MathFormula
              latex={String.raw`\int_{x_i}^{x_{i+1}} f(x)\,\mathrm{d}x \approx \frac{h}{2}\left(f(x_i)+f(x_{i+1})\right)`}
            />
          </section>

          <section className="lesson-side-card">
            <MathFormula
              latex={String.raw`T_N = h\left[\frac{f(x_0)+f(x_N)}{2}+\sum_{i=1}^{N-1}f(x_i)\right]`}
            />
            <div className="lesson-weight-grid">
              {assemblyState.weights.map((weight, index) => (
                <div key={`weight-${index}`} className="lesson-weight-chip">
                  <strong>{`x_${index}`}</strong>
                  <span>{weight === 0 ? "未进入" : weight === 0.5 ? "1/2" : "1"}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="lesson-metric-grid">
            <MetricCard label="部分和" value={formatMetric(assemblyState.partialArea)} tone="is-emphasis" />
            <MetricCard label="当前步长 h" value={formatMetric(assemblyState.step)} />
          </div>
        </aside>
      </div>
    );

  } else if (stage === "error") {
    const localGeometry = buildPlotGeometry(lessonFn, errorFocus.x0, errorFocus.x1, {
      width: 320,
      height: 220,
      margin: { top: 22, right: 18, bottom: 28, left: 34 },
      xPaddingRatio: 0.12
    });
    const localCurvePath = buildSvgPath(localGeometry.curve, localGeometry.sx, localGeometry.sy);
    const localSecantPath = buildSvgPath(
      [
        { x: errorFocus.x0, y: errorFocus.y0 },
        { x: errorFocus.x1, y: errorFocus.y1 }
      ],
      localGeometry.sx,
      localGeometry.sy
    );
    const localGapPath = `${buildSvgPath(
      errorGap,
      localGeometry.sx,
      localGeometry.sy
    )} Z`;

    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />
              {introTrapezoids.map((shape) => (
                <path
                  key={`error-${shape.index}`}
                  d={renderShapePath(shape, geometry.sx, geometry.sy)}
                  className={
                    shape.index === errorFocusIndex
                      ? "lesson-shape lesson-shape-trap is-active"
                      : "lesson-shape lesson-shape-trap"
                  }
                />
              ))}
              <rect
                x={geometry.sx(errorFocus.x0)}
                y={geometry.margin.top + 12}
                width={geometry.sx(errorFocus.x1) - geometry.sx(errorFocus.x0)}
                height={geometry.plotHeight - 24}
                className="lesson-focus-band"
              />
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
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
            n={n}
            onNChange={setN}
          />
          <section className="lesson-side-card">
            <MathFormula
              latex={String.raw`E_i = -\frac{h^3}{12} f''(\xi_i),\qquad \xi_i\in(x_i, x_{i+1})`}
            />
            <MathFormula latex={String.raw`\widehat{\kappa}_i=-\frac{12E_i}{h^3}`} />
            <MathFormula
              latex={String.raw`I - T_N = -\frac{b-a}{12}h^2 f''(\xi),\qquad \xi\in(a,b)`}
            />
          </section>

          <div className="lesson-metric-grid">
            <MetricCard label="当前近似值" value={formatMetric(globalApprox)} />
            <MetricCard label="高精参考值" value={formatMetric(reference)} />
            <MetricCard label="绝对误差" value={formatMetric(globalError)} tone="is-emphasis" />
            <MetricCard
              label="步长减半时 E_N / E_{2N}"
              value={formatRatio(halvingRatio)}
            />
          </div>

          <section className="lesson-side-card">
            <svg viewBox={`0 0 ${localGeometry.width} ${localGeometry.height}`} className="lesson-mini-chart">
              <rect x="0" y="0" width={localGeometry.width} height={localGeometry.height} rx="18" fill="#f8fbf7" />
              {renderAxes(localGeometry)}
              <path d={localGapPath} className={localError >= 0 ? "lesson-gap-fill is-under" : "lesson-gap-fill is-over"} />
              <path d={localCurvePath} className="lesson-curve-path" />
              <path d={localSecantPath} className="lesson-highlight-line" />
            </svg>
            <div className="lesson-inline-metrics">
              <span>{localError >= 0 ? "梯形低估" : "梯形高估"}</span>
              <strong>{`等效曲率指示 ≈ ${formatMetric(localEquivalentCurvature)}`}</strong>
              <span>{`局部误差 ≈ ${formatMetric(localError)}`}</span>
            </div>
          </section>
        </aside>
      </div>
    );
  } else {
    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />
              {rombergShapes.map((shape) => (
                <path
                  key={`romberg-shape-${shape.index}`}
                  d={renderShapePath(shape, geometry.sx, geometry.sy)}
                  className="lesson-shape lesson-shape-trap"
                />
              ))}
              {rombergNodes.map((node) => {
                const isNew = !oldNodeSet.has(node.x.toFixed(6));
                return (
                  <circle
                    key={`romberg-node-${node.index}`}
                    cx={geometry.sx(node.x)}
                    cy={geometry.sy(node.y)}
                    r={isNew ? 6.5 : 4.5}
                    className={isNew ? "lesson-node is-new" : "lesson-node"}
                  />
                );
              })}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <section className="lesson-side-card">
            <MathFormula
              latex={String.raw`T_{2N}=\frac12 T_N+\frac{h}{2}\sum_{i=0}^{N-1}f\!\left(x_{i+\frac12}\right)`}
            />
            <MathFormula latex={String.raw`R_{k,0}=T_{2^k}`} />
            <MathFormula
              latex={String.raw`R_{k,j}=R_{k,j-1}+\frac{R_{k,j-1}-R_{k-1,j-1}}{4^j-1}`}
            />
            <MathFormula
              latex={String.raw`R_{k,0}=O(h^2),\quad R_{k,1}=O(h^4),\quad R_{k,2}=O(h^6),\quad \cdots`}
            />
          </section>

          <section className="lesson-side-card">
            <div className="lesson-romberg-table">
              {rombergRows.map((row, rowIndex) => (
                <div key={`romberg-row-${rowIndex}`} className="lesson-romberg-row">
                  {row.map((cell) => {
                    const key = `${cell.row}-${cell.col}`;
                    const visible = visibleStepKeys.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className={
                          cell.row === rombergStep.row && cell.col === rombergStep.col
                            ? "lesson-romberg-cell is-active"
                            : "lesson-romberg-cell"
                        }
                        disabled={!visible}
                        onClick={() => {
                          const nextIndex = rombergLookup.get(key);
                          if (nextIndex !== undefined) {
                            playback.setIsPlaying(false);
                            playback.setFrameIndex(nextIndex);
                          }
                        }}
                      >
                        {visible ? formatMetric(cell.value) : "—"}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <div className="lesson-metric-grid">
            <MetricCard label="当前值" value={formatMetric(rombergStep.cell.value)} tone="is-emphasis" />
            <MetricCard label="高精参考值" value={formatMetric(reference)} />
            <MetricCard
              label="当前绝对误差"
              value={formatMetric(Math.abs(reference - rombergStep.cell.value))}
            />
            <MetricCard label="当前阶次" value={rombergStep.cell.orderLabel} />
            <MetricCard label="对应总子区间数 N" value={`${rombergCurrentN}`} />
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="lesson-page lesson-page--stacked">
      <section className="lesson-hero">
        <div>
          <span className="lesson-hero-kicker">guided lab / composite rule</span>
          <h2>梯形法实验台</h2>
          <p>从矩形近似过渡到复合梯形、曲率误差和 Romberg 外推，主图负责过程，右侧负责公式与数值解释。</p>
        </div>
        <div className="lesson-hero-badges">
          <span>{`${activeStage.label} / ${activeStage.title}`}</span>
          <span>{stage === "romberg" ? `Romberg 层数 ${rombergDepth}` : `N = ${lessonN}`}</span>
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
          n={stage === "romberg" ? rombergDepth : lessonN}
          nLabel={stage === "romberg" ? "Romberg 层数 k" : "总子区间数 N"}
          nMin={stage === "romberg" ? 2 : 2}
          nMax={stage === "romberg" ? 6 : 24}
          nStep={1}
          onNChange={(value) => {
            if (stage === "romberg") {
              setRombergDepth(value);
            } else {
              setLessonN(value);
            }
          }}
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
              <span>模式</span>
              <select value={labMode} onChange={(event) => setLabMode(event.target.value)}>
                <option value="basic">基础梯形</option>
                <option value="composite">复合梯形</option>
                <option value="romberg">Romberg</option>
              </select>
            </label>

            <label className="lesson-form-inline">
              <span>{labMode === "romberg" ? "深度" : "N"}</span>
              <input
                type="range"
                min={labMode === "romberg" ? 2 : 1}
                max={labMode === "romberg" ? 6 : 32}
                step="1"
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
                  <MetricCard label="近似值" value={formatMetric(labResult.approximation)} tone="is-emphasis" />
                  <MetricCard label="高精参考值" value={formatMetric(labResult.reference)} />
                  <MetricCard
                    label="绝对误差"
                    value={formatMetric(Math.abs(labResult.reference - labResult.approximation))}
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
