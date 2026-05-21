import { useRef, useState } from "react";
import {
  compileExpression,
  formatExpressionAsLatex,
  formatMetric,
  parseDirectedInterval,
  generateNiceTicks
} from "../utils/numericalMethods";
import { referenceIntegral } from "../utils/lessonMath";
import { MathFormula } from "./MathFormula";

const DEFAULT_EXPRESSION = "0.5 * x * sin(x) + cos(x) + 1.5";
const DEFAULT_A = "0.5";
const DEFAULT_B = "5.5";
const CHART_WIDTH = 960;
const CHART_HEIGHT = 540;
const CHART_MARGIN = {
  top: 24,
  right: 24,
  bottom: 52,
  left: 58
};
const METHOD_OPTIONS = [
  { id: "left", label: "左矩形" },
  { id: "midpoint", label: "中点矩形" },
  { id: "right", label: "右矩形" },
  { id: "trapezoid", label: "梯形法" }
];
const RECT_FILL = "rgba(244, 167, 185, 0.65)";
const RECT_STROKE = "#c2185b";
const TRAP_FILL = "rgba(165, 214, 247, 0.72)";
const TRAP_STROKE = "#1565c0";
const CURVE_COLOR = "#1b5e20";
const MARK_COLOR = "#e65100";
const DRAGGING_MARK_COLOR = "#bf360c";

function roundPoint(value) {
  return Number(value.toFixed(6));
}

function buildUniformNodes(a, b, n) {
  return Array.from({ length: n + 1 }, (_, index) => a + ((b - a) * index) / n);
}

function buildNodes(a, b, n, customPoints, useCustom) {
  const validPoints = customPoints
    .filter((point) => point > a && point < b)
    .map(roundPoint)
    .sort((left, right) => left - right);

  if (!useCustom || validPoints.length === 0) {
    return buildUniformNodes(a, b, n);
  }

  return [a, ...validPoints, b].map(roundPoint).sort((left, right) => left - right);
}

function computeApproximation(fn, nodes, method) {
  let area = 0;

  for (let index = 0; index < nodes.length - 1; index += 1) {
    const x0 = nodes[index];
    const x1 = nodes[index + 1];
    const h = x1 - x0;

    if (method === "left") {
      area += fn(x0) * h;
      continue;
    }

    if (method === "right") {
      area += fn(x1) * h;
      continue;
    }

    if (method === "midpoint") {
      area += fn((x0 + x1) / 2) * h;
      continue;
    }

    area += ((fn(x0) + fn(x1)) / 2) * h;
  }

  return area;
}

function buildCurveSamples(fn, xMin, xMax) {
  const samples = [];

  for (let index = 0; index < 420; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / 419;

    try {
      const y = fn(x);
      if (Number.isFinite(y)) {
        samples.push({ x, y });
      }
    } catch (_error) {
      continue;
    }
  }

  if (samples.length < 2) {
    throw new Error("当前表达式在图像采样区间内无法生成有效曲线。");
  }

  return samples;
}

function buildScale(domainStart, domainEnd, rangeStart, rangeEnd) {
  const domainSpan = domainEnd - domainStart;
  const rangeSpan = rangeEnd - rangeStart;
  return (value) => rangeStart + ((value - domainStart) / domainSpan) * rangeSpan;
}

function buildPath(points, scaleX, scaleY) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.x)} ${scaleY(point.y)}`)
    .join(" ");
}

function buildPolygonPath(points, scaleX, scaleY) {
  return `${buildPath(points, scaleX, scaleY)} Z`;
}

function getMethodLabel(method) {
  return METHOD_OPTIONS.find((option) => option.id === method)?.label || "中点矩形";
}

function buildExperiment(expression, aText, bText, n, method, customPoints, useCustom) {
  const fn = compileExpression(expression);
  const interval = parseDirectedInterval(aText, bText);
  const a = interval.lower;
  const b = interval.upper;
  const span = b - a;
  const xPadding = Math.max(span * 0.14, 0.2);
  const xMin = a - xPadding;
  const xMax = b + xPadding;
  const nodes = buildNodes(a, b, n, customPoints, useCustom);
  const approximation = interval.direction * computeApproximation(fn, nodes, method);
  const reference = referenceIntegral(fn, interval.start, interval.end, 4096);
  const curveSamples = buildCurveSamples(fn, xMin, xMax);
  const subdivisionCount = nodes.length - 1;
  const activeCustomPoints = customPoints.filter((point) => point > a && point < b);

  return {
    fn,
    start: interval.start,
    end: interval.end,
    direction: interval.direction,
    a,
    b,
    xMin,
    xMax,
    nodes,
    approximation,
    reference,
    absoluteError: Math.abs(approximation - reference),
    curveSamples,
    subdivisionCount,
    useCustom: useCustom && activeCustomPoints.length > 0,
    customPoints: activeCustomPoints
  };
}

export function NumericalIntegrationVisualizer() {
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [aText, setAText] = useState(DEFAULT_A);
  const [bText, setBText] = useState(DEFAULT_B);
  const [n, setN] = useState(6);
  const [method, setMethod] = useState("midpoint");
  const [customPoints, setCustomPoints] = useState([]);
  const [useCustom, setUseCustom] = useState(false);
  const [draggingPointIndex, setDraggingPointIndex] = useState(null);
  const plotRef = useRef(null);
  const dragStateRef = useRef({
    pointerId: null,
    moved: false
  });

  let experiment = null;
  let visualizerError = "";
  let formulaLatex = "";

  try {
    formulaLatex = formatExpressionAsLatex(expression);
  } catch (_error) {
    formulaLatex = "";
  }

  try {
    experiment = buildExperiment(expression, aText, bText, n, method, customPoints, useCustom);
  } catch (error) {
    visualizerError = error.message || "表达式或区间暂时无法计算。";
  }

  const isReady = Boolean(experiment);
  const isTrapezoid = method === "trapezoid";
  const fillColor = isTrapezoid ? TRAP_FILL : RECT_FILL;
  const strokeColor = isTrapezoid ? TRAP_STROKE : RECT_STROKE;

  const plotWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;

  const scaleX = isReady
    ? buildScale(
        experiment.xMin,
        experiment.xMax,
        CHART_MARGIN.left,
        CHART_MARGIN.left + plotWidth
      )
    : null;
  const yValues = isReady ? experiment.curveSamples.map((point) => point.y) : [0];
  const yMin = Math.min(...yValues, 0) - 0.35;
  const yMax = Math.max(...yValues, 0) + 0.45;
  const scaleY = isReady
    ? buildScale(yMin, yMax, CHART_MARGIN.top + plotHeight, CHART_MARGIN.top)
    : null;
  const baselineY = isReady ? scaleY(0) : CHART_HEIGHT / 2;

  const functionPath =
    isReady && scaleX && scaleY ? buildPath(experiment.curveSamples, scaleX, scaleY) : "";
  const fillShapes = [];

  if (isReady && scaleX && scaleY) {
    for (let index = 0; index < experiment.nodes.length - 1; index += 1) {
      const x0 = experiment.nodes[index];
      const x1 = experiment.nodes[index + 1];
      const y0 = experiment.fn(x0);
      const y1 = experiment.fn(x1);

      if (isTrapezoid) {
        fillShapes.push(
          buildPolygonPath(
            [
              { x: x0, y: 0 },
              { x: x0, y: y0 },
              { x: x1, y: y1 },
              { x: x1, y: 0 }
            ],
            scaleX,
            scaleY
          )
        );
        continue;
      }

      const sampleY =
        method === "left"
          ? y0
          : method === "right"
            ? y1
            : experiment.fn((x0 + x1) / 2);

      fillShapes.push(
        buildPolygonPath(
          [
            { x: x0, y: 0 },
            { x: x0, y: sampleY },
            { x: x1, y: sampleY },
            { x: x1, y: 0 }
          ],
          scaleX,
          scaleY
        )
      );
    }
  }

  const xTicks = isReady
    ? generateNiceTicks(experiment.xMin, experiment.xMax, 6)
    : [];
  const yTicks = isReady
    ? generateNiceTicks(yMin, yMax, 5)
    : [];

  function resetCustomNodes() {
    setCustomPoints([]);
    setUseCustom(false);
    setDraggingPointIndex(null);
    dragStateRef.current.pointerId = null;
    dragStateRef.current.moved = false;
  }

  function handleSliderChange(event) {
    setN(Number(event.target.value));
    resetCustomNodes();
  }

  function handleChartClick(event) {
    if (!experiment) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const x = experiment.xMin + ratio * (experiment.xMax - experiment.xMin);

    if (!(x > experiment.a && x < experiment.b)) {
      return;
    }

    const tooClose = experiment.customPoints.some(
      (point) => Math.abs(point - x) < (experiment.b - experiment.a) / 200
    );
    if (tooClose) {
      return;
    }

    setCustomPoints((current) =>
      [...current, roundPoint(x)].sort((left, right) => left - right)
    );
    setUseCustom(true);
  }

  function updateDraggedPoint(clientX) {
    if (!experiment || !plotRef.current || draggingPointIndex === null) {
      return;
    }

    const bounds = plotRef.current.getBoundingClientRect();
    const ratio = (clientX - bounds.left) / bounds.width;
    const nextX = experiment.xMin + ratio * (experiment.xMax - experiment.xMin);

    setCustomPoints((current) =>
      current.map((point, index) => {
        if (index !== draggingPointIndex) {
          return point;
        }

        const spacing = (experiment.b - experiment.a) / 200;
        const leftBound =
          index === 0 ? experiment.a + spacing : current[index - 1] + spacing;
        const rightBound =
          index === current.length - 1
            ? experiment.b - spacing
            : current[index + 1] - spacing;
        const clampedX = Math.min(Math.max(nextX, leftBound), rightBound);
        return roundPoint(clampedX);
      })
    );
  }

  function stopDragging() {
    dragStateRef.current.pointerId = null;
    dragStateRef.current.moved = false;
    setDraggingPointIndex(null);
  }

  function handlePointPointerDown(event, pointIndex) {
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current.pointerId = event.pointerId;
    dragStateRef.current.moved = false;
    setDraggingPointIndex(pointIndex);
    setUseCustom(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointPointerMove(event) {
    if (dragStateRef.current.pointerId !== event.pointerId || draggingPointIndex === null) {
      return;
    }

    dragStateRef.current.moved = true;
    updateDraggedPoint(event.clientX);
  }

  function handlePointPointerUp(event) {
    if (dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    stopDragging();
  }

  function deleteCustomPoint(pointIndex) {
    const nextPoints = customPoints.filter((_, index) => index !== pointIndex);
    setCustomPoints(nextPoints);
    setDraggingPointIndex(null);

    if (nextPoints.length === 0) {
      setUseCustom(false);
    }
  }

  function switchToUniformPartition() {
    if (experiment?.useCustom && experiment.subdivisionCount) {
      setN(experiment.subdivisionCount);
    }

    resetCustomNodes();
  }

  function handlePointContextMenu(event, pointIndex) {
    event.preventDefault();
    event.stopPropagation();
    deleteCustomPoint(pointIndex);
  }

  function handlePointDoubleClick(event, pointIndex) {
    event.preventDefault();
    event.stopPropagation();
    deleteCustomPoint(pointIndex);
  }

  return (
    <div className="visualizer-shell">
      <div className="visualizer-header">
        <div>
          <p className="eyebrow">Integration Lab</p>
          <h2>数值积分交互可视化</h2>
          <p className="visualizer-copy">
            现在不再固定函数。你可以直接输入 <code>f(x)</code> 和积分区间，
            图像、填充块、近似值与误差会同步更新。
          </p>
        </div>
        <div className="visualizer-kpis">
          <article className="visualizer-kpi">
            <span>方法</span>
            <strong>{getMethodLabel(method)}</strong>
          </article>
          <article className="visualizer-kpi">
            <span>当前分割</span>
            <strong>
              {experiment?.useCustom ? "自定义" : `${experiment?.subdivisionCount || n} 个子区间`}
            </strong>
          </article>
          <article className="visualizer-kpi">
            <span>误差</span>
            <strong>{experiment ? formatMetric(experiment.absoluteError) : "--"}</strong>
          </article>
        </div>
      </div>

      <div className="visualizer-card">
        <div className="visualizer-form">
          <label className="visualizer-field">
            <span>被积函数 f(x)</span>
            <input
              value={expression}
              onChange={(event) => {
                setExpression(event.target.value);
                resetCustomNodes();
              }}
              placeholder="例如：sin(x) + x^2"
            />
          </label>

          <label className="visualizer-field">
            <span>下限 a</span>
            <input
              value={aText}
              onChange={(event) => {
                setAText(event.target.value);
                resetCustomNodes();
              }}
              placeholder="0"
            />
          </label>

          <label className="visualizer-field">
            <span>上限 b</span>
            <input
              value={bText}
              onChange={(event) => {
                setBText(event.target.value);
                resetCustomNodes();
              }}
              placeholder="1"
            />
          </label>
        </div>

        <div className="visualizer-input-hint">
          支持 `sin(x)`、`cos(x)`、`exp(x)`、`log(x)`、`sqrt(x)`、`x^2`、`2x`、`x sin(x)`
          这类写法。
        </div>

        <div className="visualizer-formula-preview">
          <span>公式预览</span>
          {formulaLatex ? <MathFormula latex={`f(x)=${formulaLatex}`} block={false} /> : <strong>--</strong>}
        </div>

        <div className="visualizer-controls">
          <label className="visualizer-slider">
            <div className="visualizer-control-head">
              <span>总子区间数 N</span>
              <strong>{n}</strong>
            </div>
            <input type="range" min="1" max="80" step="1" value={n} title={String(n)} onChange={handleSliderChange} />
          </label>

          <div className="visualizer-methods">
            {METHOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={option.id === method ? "method-chip is-active" : "method-chip"}
                onClick={() => setMethod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="visualizer-actions">
            <button type="button" className="secondary-button" onClick={resetCustomNodes}>
              重置分割
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={switchToUniformPartition}
            >
              切换等分
            </button>
          </div>
        </div>

        <div className="visualizer-partition-note">
          {experiment?.useCustom
            ? `当前是 ${experiment.subdivisionCount} 段自定义分割，点击“切换等分”会改成 ${experiment.subdivisionCount} 个子区间。`
            : `当前是 ${experiment?.subdivisionCount || n} 个子区间。点击图像可以插入自定义分割点。`}
        </div>

        {visualizerError ? <div className="visualizer-error">{visualizerError}</div> : null}

        <div className="visualizer-metrics">
          <div>
            <span>近似值</span>
            <strong>{experiment ? formatMetric(experiment.approximation) : "--"}</strong>
          </div>
          <div>
            <span>参考值</span>
            <strong>{experiment ? formatMetric(experiment.reference) : "--"}</strong>
          </div>
          <div>
            <span>误差</span>
            <strong>{experiment ? formatMetric(experiment.absoluteError) : "--"}</strong>
          </div>
          <div>
            <span>总子区间数 N</span>
            <strong>{experiment?.subdivisionCount || "--"}</strong>
          </div>
        </div>

        <div className="visualizer-plot-wrap">
          <svg
            ref={plotRef}
            className="visualizer-plot"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="数值积分交互图像"
          >
            <rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} rx="26" fill="#f7f9fc" />

            {isReady
              ? yTicks.map((tick) => (
                  <g key={`y-${tick}`}>
                    <line
                      x1={CHART_MARGIN.left}
                      x2={CHART_MARGIN.left + plotWidth}
                      y1={scaleY(tick)}
                      y2={scaleY(tick)}
                      className="plot-grid-line"
                    />
                    <text
                      x={CHART_MARGIN.left - 12}
                      y={scaleY(tick) + 4}
                      textAnchor="end"
                      className="plot-axis-label"
                    >
                      {tick.toFixed(2)}
                    </text>
                  </g>
                ))
              : null}

            {isReady
              ? xTicks.map((tick) => (
                  <g key={`x-${tick}`}>
                    <line
                      x1={scaleX(tick)}
                      x2={scaleX(tick)}
                      y1={CHART_MARGIN.top}
                      y2={CHART_MARGIN.top + plotHeight}
                      className="plot-grid-line"
                    />
                    <text
                      x={scaleX(tick)}
                      y={CHART_MARGIN.top + plotHeight + 28}
                      textAnchor="middle"
                      className="plot-axis-label"
                    >
                      {tick.toFixed(2)}
                    </text>
                  </g>
                ))
              : null}

            <line
              x1={CHART_MARGIN.left}
              x2={CHART_MARGIN.left + plotWidth}
              y1={baselineY}
              y2={baselineY}
              className="plot-axis-line"
            />

            {isReady
              ? fillShapes.map((shapePath) => (
                  <path
                    key={shapePath}
                    d={shapePath}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="1.5"
                  />
                ))
              : null}

            {isReady
              ? experiment.nodes.map((node) => (
                  <line
                    key={`node-${node}`}
                    x1={scaleX(node)}
                    x2={scaleX(node)}
                    y1={CHART_MARGIN.top}
                    y2={CHART_MARGIN.top + plotHeight}
                    className="plot-node-line"
                    stroke={strokeColor}
                  />
                ))
              : null}

            {isReady ? (
              <path d={functionPath} fill="none" stroke={CURVE_COLOR} strokeWidth="4" />
            ) : null}

            {isReady ? (
              <rect
                x={CHART_MARGIN.left}
                y={CHART_MARGIN.top}
                width={plotWidth}
                height={plotHeight}
                fill="transparent"
                className="plot-hit-area"
                onClick={handleChartClick}
              />
            ) : null}

            {isReady && experiment.useCustom
              ? experiment.customPoints.map((point, index) => (
                  <circle
                    key={`mark-${point}-${index}`}
                    cx={scaleX(point)}
                    cy={scaleY(experiment.fn(point))}
                    r={draggingPointIndex === index ? "7.5" : "6"}
                    fill={draggingPointIndex === index ? DRAGGING_MARK_COLOR : MARK_COLOR}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="plot-point-handle"
                    onPointerDown={(event) => handlePointPointerDown(event, index)}
                    onPointerMove={handlePointPointerMove}
                    onPointerUp={handlePointPointerUp}
                    onPointerCancel={handlePointPointerUp}
                    onContextMenu={(event) => handlePointContextMenu(event, index)}
                    onDoubleClick={(event) => handlePointDoubleClick(event, index)}
                    onClick={(event) => event.stopPropagation()}
                  />
                ))
              : null}
          </svg>

          <div className="visualizer-legend">
            <span>
              <i className="legend-swatch legend-swatch-curve" />
              被积函数
            </span>
            <span>
              <i
                className="legend-swatch"
                style={{ background: fillColor, borderColor: strokeColor }}
              />
              {isTrapezoid ? "梯形填充" : "矩形填充"}
            </span>
            <span>
              <i className="legend-swatch legend-swatch-mark" />
              手动分割点
            </span>
          </div>
        </div>

        <div className="visualizer-footnote">
          <p>
            点击图像中的积分区间可以手动插入分割点。拖动橙色点可以调整已有分割位置。
          </p>
          <p>
            右键橙色点或双击橙色点可以删除它。拖动滑块或修改函数/区间会恢复成标准等分。
          </p>
          <p>
            高精参考值使用高分辨率辛普森积分在前端估算。
          </p>
        </div>
      </div>
    </div>
  );
}
