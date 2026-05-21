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
import { getClosedNewtonCotesRule } from "../data/newtonCotesWeights";
import {
  buildPlotGeometry,
  buildSinglePanelInterpolant,
  buildSvgPath,
  clamp,
  compositeClosedNewtonCotes,
  referenceIntegral,
  singlePanelClosedNewtonCotes
} from "../utils/lessonMath";
import { useLessonKeyboardShortcuts, useLessonPlayback } from "../utils/useLessonPlayback";

const STAGES = [
  {
    id: "family",
    label: "阶段 1",
    title: "家族主线",
    questionId: "q5"
  },
  {
    id: "generator",
    label: "阶段 2",
    title: "统一生成公式",
    questionId: "q5"
  },
  {
    id: "weights",
    label: "阶段 3",
    title: "权重变化",
    questionId: "q5"
  },
  {
    id: "challenge",
    label: "阶段 4",
    title: "高阶单面板的反例",
    questionId: "q5"
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

const FAMILY_RULES = [
  {
    order: 1,
    name: "梯形"
  },
  {
    order: 2,
    name: "Simpson 1/3"
  },
  {
    order: 3,
    name: "Simpson 3/8"
  },
  {
    order: 4,
    name: "Boole"
  }
];

const GENERATOR_STEPS = ["放节点", "长出插值多项式", "对插值多项式积分", "压缩成权重公式"];

const PRESETS = [
  { id: "sin", label: "正弦半波", expression: "sin(x)", a: "0", b: "pi" },
  { id: "rational", label: "有理函数", expression: "1/(1+x^2)", a: "0", b: "3" },
  { id: "gauss", label: "高斯钟形", expression: "exp(-x^2)", a: "0", b: "2" },
  { id: "runge", label: "Runge 函数", expression: "1/(1+25*x^2)", a: "-1", b: "1" }
];

const CHART = {
  width: 960,
  height: 500,
  margin: { top: 28, right: 28, bottom: 52, left: 60 }
};
const RUNGE_REFERENCE = (2 / 5) * Math.atan(5);
const RUNGE_REFERENCE_LATEX = String.raw`\int_{-1}^{1}\frac{1}{1+25x^2}\,\mathrm{d}x=\frac{2}{5}\arctan 5`;

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

export function NewtonCotesInteractivePage({
  globalExpr,
  globalA,
  globalB,
  onGlobalChange,
  requestedStage
}) {
  const [stage, setStage] = useState("family");
  const [order, setOrder] = useState(4);
  const [challengeCaseId, setChallengeCaseId] = useState("wall");
  const [labOpen, setLabOpen] = useState(false);
  const [labExpr, setLabExpr] = useState(globalExpr || "1/(1+x^2)");
  const [labA, setLabA] = useState(globalA || "0");
  const [labB, setLabB] = useState(globalB || "3");
  const [labOrder, setLabOrder] = useState(4);
  const [labPanels, setLabPanels] = useState(2);
  const activeStage = STAGES.find((item) => item.id === stage) ?? STAGES[0];

  useEffect(() => {
    if (requestedStage && STAGES.some((item) => item.id === requestedStage)) {
      setStage(requestedStage);
    }
  }, [requestedStage]);

  useEffect(() => {
    setLabExpr(globalExpr || "1/(1+x^2)");
    setLabA(globalA || "0");
    setLabB(globalB || "3");
  }, [globalA, globalB, globalExpr]);

  useEffect(() => {
    const maxByStage = stage === "generator" ? 6 : stage === "family" ? 4 : 10;
    if (order > maxByStage) {
      setOrder(maxByStage);
    }
  }, [order, stage]);

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
    if (stage === "family") {
      return 4;
    }
    if (stage === "generator") {
      return 4;
    }
    if (stage === "weights") {
      return order + 1;
    }
    return 10;
  }, [order, stage]);

  const playback = useLessonPlayback({
    frameCount,
    resetKey: `${stage}:${order}:${challengeCaseId}`
  });

  useLessonKeyboardShortcuts({
    onTogglePlay: () => playback.setIsPlaying((previous) => !previous),
    onPrev: playback.goPrev,
    onNext: playback.goNext
  });

  const familyRuleMeta = FAMILY_RULES[playback.frameIndex] || FAMILY_RULES[0];
  const familyRule = getClosedNewtonCotesRule(familyRuleMeta.order);
  const familyInterpolant = buildSinglePanelInterpolant(lessonFn, a, b, familyRule.order);
  const familyInterpolantPath = buildSvgPath(
    familyInterpolant.curvePoints,
    geometry.sx,
    geometry.sy
  );

  const generatorRule = getClosedNewtonCotesRule(order);
  const generatorInterpolant = buildSinglePanelInterpolant(lessonFn, a, b, generatorRule.order);
  const generatorInterpolantPath = buildSvgPath(
    generatorInterpolant.curvePoints,
    geometry.sx,
    geometry.sy
  );

  const weightRule = getClosedNewtonCotesRule(order);
  const weightVisibleCount = clamp(playback.frameIndex + 1, 1, weightRule.weights.length);
  const weightMax = Math.max(...weightRule.weights.map((weight) => Math.abs(weight))) || 1;

  const challengeCase = useMemo(() => {
    if (challengeCaseId === "runge") {
      const fn = (x) => 1 / (1 + 25 * x * x);
      return {
        id: "runge",
        label: "Runge 函数",
        fn,
        a: -1,
        b: 1,
        reference: RUNGE_REFERENCE,
        referenceLabel: "解析真值",
        referenceLatex: RUNGE_REFERENCE_LATEX
      };
    }

    return {
      id: "wall",
      label: "秦长城轮廓",
      fn: lessonFn,
      a,
      b,
      reference,
      referenceLabel: "高精参考值",
      referenceLatex: null
    };
  }, [a, b, challengeCaseId, lessonFn, reference]);

  const challengeGeometry = buildPlotGeometry(challengeCase.fn, challengeCase.a, challengeCase.b, CHART);
  const challengeCurvePath = buildSvgPath(
    challengeGeometry.curve,
    challengeGeometry.sx,
    challengeGeometry.sy
  );
  const challengeOrder = playback.frameIndex + 1;
  const challengeRule = getClosedNewtonCotesRule(challengeOrder);
  const challengeInterpolant = buildSinglePanelInterpolant(
    challengeCase.fn,
    challengeCase.a,
    challengeCase.b,
    challengeOrder
  );
  const challengeInterpolantPath = buildSvgPath(
    challengeInterpolant.curvePoints,
    challengeGeometry.sx,
    challengeGeometry.sy
  );
  const challengeApproximation = singlePanelClosedNewtonCotes(
    challengeCase.fn,
    challengeCase.a,
    challengeCase.b,
    challengeRule
  );
  const challengeError = Math.abs(challengeCase.reference - challengeApproximation);
  const challengeSequence = Array.from({ length: 10 }, (_, index) => {
    const currentOrder = index + 1;
    const currentRule = getClosedNewtonCotesRule(currentOrder);
    const value = singlePanelClosedNewtonCotes(
      challengeCase.fn,
      challengeCase.a,
      challengeCase.b,
      currentRule
    );

    return {
      order: currentOrder,
      error: Math.abs(challengeCase.reference - value)
    };
  });
  const benchmarkPanels = Math.max(1, Math.floor(challengeOrder / 2));
  const compositeBenchmark = compositeClosedNewtonCotes(
    challengeCase.fn,
    challengeCase.a,
    challengeCase.b,
    benchmarkPanels,
    getClosedNewtonCotesRule(2)
  );
  const compositeBenchmarkError = Math.abs(
    challengeCase.reference - compositeBenchmark.value
  );

  const labResult = useMemo(() => {
    try {
      const customCase = buildCustomFunctionCase(labExpr, labA, labB);
      const currentRule = getClosedNewtonCotesRule(labOrder);
      const result = compositeClosedNewtonCotes(
        customCase.fn,
        customCase.a,
        customCase.b,
        labPanels,
        currentRule
      );

      return {
        ...customCase,
        approximation: result.value,
        totalSegments: result.totalSegments,
        panels: result.panelCount
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "表达式无法解析。"
      };
    }
  }, [labA, labB, labExpr, labOrder, labPanels]);

  let stageBody = null;

  if (stage === "family") {
    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <div className="lesson-card-head">
              <h3>{familyRule.name}</h3>
            </div>

            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />
              <path d={familyInterpolantPath} className="lesson-highlight-line lesson-highlight-line-pink" />
              {familyInterpolant.nodes.map((node, index) => (
                <circle
                  key={`family-node-${index}`}
                  cx={geometry.sx(node.x)}
                  cy={geometry.sy(node.y)}
                  r="5"
                  className="lesson-node is-active"
                />
              ))}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <section className="lesson-side-card">
            <div className="lesson-family-grid">
              {FAMILY_RULES.map((item) => (
                <button
                  key={item.order}
                  type="button"
                  className={
                    item.order === familyRule.order
                      ? "lesson-family-card is-active"
                      : "lesson-family-card"
                  }
                  onClick={() => playback.setFrameIndex(item.order - 1)}
                >
                  <strong>{item.name}</strong>
                  <span>{`m=${item.order}`}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="lesson-side-card">
            <MathFormula latex={familyRule.exactFormulaLatex} />
            <div className="lesson-metric-grid">
              <MetricCard label="单面板子区间数 m" value={`${familyRule.order}`} />
              <MetricCard label="插值次数" value={`${familyRule.order}`} />
              <MetricCard label="代数精度" value={`${familyRule.degreeOfPrecision}`} />
              <MetricCard
                label="复合全局误差阶"
                value={`O(h^${familyRule.compositeErrorOrder})`}
                tone="is-emphasis"
              />
            </div>
          </section>
        </aside>
      </div>
    );
  } else if (stage === "generator") {
    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <div className="lesson-card-head">
              <h3>{`m=${generatorRule.order} 的闭型 Newton–Cotes`}</h3>
            </div>

            <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="lesson-chart">
              <rect x="0" y="0" width={geometry.width} height={geometry.height} rx="24" fill="#f8fbf7" />
              {renderAxes(geometry)}
              <path d={curvePath} className="lesson-curve-path" />
              {playback.frameIndex >= 1 ? (
                <path d={generatorInterpolantPath} className="lesson-highlight-line lesson-highlight-line-pink" />
              ) : null}
              {generatorInterpolant.nodes.map((node, index) => (
                <circle
                  key={`generator-node-${index}`}
                  cx={geometry.sx(node.x)}
                  cy={geometry.sy(node.y)}
                  r={playback.frameIndex >= 2 ? 6 : 5}
                  className={playback.frameIndex >= 0 ? "lesson-node is-active" : "lesson-node"}
                />
              ))}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <section className="lesson-side-card">
            <MathFormula
              latex={String.raw`Q_m[f] = h\sum_{i=0}^{m} w_i^{(m)} f(x_i),\qquad x_i = a + ih`}
            />
            <MathFormula
              latex={String.raw`w_i^{(m)} = \int_0^m \ell_i(t)\,\mathrm{d}t,\qquad \ell_i(t)=\prod_{j\ne i}\frac{t-j}{i-j}`}
            />
            <MathFormula latex={generatorRule.exactFormulaLatex} />
          </section>

          <section className="lesson-side-card">
            <div className="lesson-weight-grid">
              {generatorRule.weightFractions.map((weight, index) => (
                <div key={`generator-weight-${index}`} className="lesson-weight-chip is-visible">
                  <strong>w<sub>{index}</sub></strong>
                  <span>{weight.text}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="lesson-side-card">
            <div className="lesson-weight-grid">
              {generatorRule.monomialChecks.slice(0, 6).map((check) => (
                <div key={`check-${check.power}`} className="lesson-weight-chip is-visible">
                  <strong>t<sup>{check.power}</sup></strong>
                  <span>{check.isExact ? "精确" : "失配"}</span>
                </div>
              ))}
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
            <div className="lesson-card-head">
              <h3>{`m=${weightRule.order} 的闭型 NC 权重`}</h3>
            </div>

            <svg viewBox="0 0 960 500" className="lesson-chart">
              <rect x="0" y="0" width="960" height="500" rx="24" fill="#f8fbf7" />
              <line x1="80" x2="900" y1="250" y2="250" className="lesson-axis-line" />
              {weightRule.weights.slice(0, weightVisibleCount).map((weight, index) => {
                const height = (Math.abs(weight) / weightMax) * 160;
                const x = 110 + index * (760 / Math.max(weightRule.weights.length - 1, 1));
                const y = weight >= 0 ? 250 - height : 250;
                return (
                  <g key={`bar-${index}`}>
                    <rect
                      x={x - 18}
                      y={y}
                      width="36"
                      height={height}
                      className={weight >= 0 ? "lesson-weight-bar is-positive" : "lesson-weight-bar is-negative"}
                    />
                    <text x={x} y="282" textAnchor="middle" className="lesson-bar-label">w<tspan dy="4" fontSize="0.75em">{index}</tspan></text>
                  </g>
                );
              })}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <div className="lesson-metric-grid">
            <MetricCard label="代数精度" value={`${weightRule.degreeOfPrecision}`} />
            <MetricCard label="单面板误差幂次" value={`O(h^${weightRule.singlePanelErrorOrder})`} />
            <MetricCard label="复合全局误差阶" value={`O(h^${weightRule.compositeErrorOrder})`} />
            <MetricCard label="最大权重绝对值" value={formatMetric(weightRule.maxWeight)} />
            <MetricCard label={<>Λ<sub>m</sub> = Σ|w<sub>i</sub>|</>} value={formatMetric(weightRule.lambda)} tone="is-emphasis" />
          </div>
        </aside>
      </div>
    );
  } else {
    stageBody = (
      <div className="lesson-stage-shell lesson-stage-shell--two-col">
        <section className="lesson-main-column">
          <article className="lesson-main-card">
            <div className="lesson-card-head">
              <h3>{`${challengeCase.label}，单面板 m=${challengeOrder}`}</h3>
            </div>

            <svg viewBox={`0 0 ${challengeGeometry.width} ${challengeGeometry.height}`} className="lesson-chart">
              <rect
                x="0"
                y="0"
                width={challengeGeometry.width}
                height={challengeGeometry.height}
                rx="24"
                fill="#f8fbf7"
              />
              {renderAxes(challengeGeometry)}
              <path d={challengeCurvePath} className="lesson-curve-path" />
              <path d={challengeInterpolantPath} className="lesson-highlight-line lesson-highlight-line-pink" />
              {challengeInterpolant.nodes.map((node, index) => (
                <circle
                  key={`challenge-node-${index}`}
                  cx={challengeGeometry.sx(node.x)}
                  cy={challengeGeometry.sy(node.y)}
                  r="5"
                  className="lesson-node is-active"
                />
              ))}
            </svg>
          </article>
        </section>

        <aside className="lesson-side-column">
          <section className="lesson-side-card">
            <div className="lesson-chip-row">
              <button
                type="button"
                className={challengeCaseId === "wall" ? "lesson-chip is-active" : "lesson-chip"}
                onClick={() => setChallengeCaseId("wall")}
              >
                秦长城轮廓
              </button>
              <button
                type="button"
                className={challengeCaseId === "runge" ? "lesson-chip is-active" : "lesson-chip"}
                onClick={() => setChallengeCaseId("runge")}
              >
                Runge 函数
              </button>
            </div>
          </section>

          {challengeCase.referenceLatex ? (
            <section className="lesson-side-card">
              <MathFormula latex={challengeCase.referenceLatex} />
            </section>
          ) : null}

          <div className="lesson-metric-grid">
            <MetricCard label="当前近似值" value={formatMetric(challengeApproximation)} />
            <MetricCard label={challengeCase.referenceLabel} value={formatMetric(challengeCase.reference)} />
            <MetricCard label="绝对误差" value={formatMetric(challengeError)} tone="is-emphasis" />
            <MetricCard label="同预算复合 Simpson 误差" value={formatMetric(compositeBenchmarkError)} />
            <MetricCard label="负权个数" value={`${challengeRule.negativeCount}`} />
            <MetricCard label={<>Λ<sub>m</sub> = Σ|w<sub>i</sub>|</>} value={formatMetric(challengeRule.lambda)} />
          </div>

          <section className="lesson-side-card">
            <div className="lesson-weight-grid">
              {challengeSequence.map((item) => (
                <div
                  key={`challenge-seq-${item.order}`}
                  className={
                    item.order === challengeOrder
                      ? "lesson-weight-chip is-visible"
                      : "lesson-weight-chip"
                  }
                >
                  <strong>{`m=${item.order}`}</strong>
                  <span>{formatMetric(item.error)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    );
  }


  return (
    <div className="lesson-page lesson-page--stacked">
      <section className="lesson-hero">
        <div>
          <span className="lesson-hero-kicker">guided lab / formula family</span>
          <h2>牛顿-科特斯实验台</h2>
          <p>把公式族、权重生成、稳定性指标和高阶单面板反例放进同一舞台，突出“高阶不等于稳”的判断线索。</p>
        </div>
        <div className="lesson-hero-badges">
          <span>{`${activeStage.label} / ${activeStage.title}`}</span>
          <span>{`m = ${stage === "challenge" ? challengeOrder : stage === "family" ? familyRule.order : order}`}</span>
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
          n={stage === "challenge" ? challengeOrder : stage === "family" ? familyRule.order : order}
          nLabel="单面板子区间数 m"
          nMin={1}
          nMax={stage === "family" ? 4 : stage === "generator" ? 6 : 10}
          nStep={1}
          onNChange={(value) => {
            if (stage === "family" || stage === "challenge") {
              playback.setFrameIndex(value - 1);
            } else {
              setOrder(value);
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
              <span>单面板子区间数 m</span>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={labOrder}
                onChange={(event) => setLabOrder(Number(event.target.value))}
              />
              <strong>{labOrder}</strong>
            </label>

            <label className="lesson-form-inline">
              <span>复合面板数</span>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={labPanels}
                onChange={(event) => setLabPanels(Number(event.target.value))}
              />
              <strong>{labPanels}</strong>
            </label>
          </section>

          <section className="lesson-side-card">
            {"error" in labResult ? (
              <p className="lesson-inline-copy">{labResult.error}</p>
            ) : (
              <>
                <div className="lesson-metric-grid">
                  <MetricCard
                    label="近似值"
                    value={formatMetric(labResult.approximation)}
                    tone="is-emphasis"
                  />
                  <MetricCard label="高精参考值" value={formatMetric(labResult.reference)} />
                  <MetricCard
                    label="绝对误差"
                    value={formatMetric(Math.abs(labResult.reference - labResult.approximation))}
                  />
                  <MetricCard label="总子区间数" value={`${labResult.totalSegments}`} />
                </div>
              </>
            )}
          </section>
        </div>
      </details>
    </div>
  );
}
