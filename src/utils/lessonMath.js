export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function createLinearScale(domainStart, domainEnd, rangeStart, rangeEnd) {
  const domainSpan = domainEnd - domainStart || 1;
  const rangeSpan = rangeEnd - rangeStart;
  return (value) => rangeStart + ((value - domainStart) / domainSpan) * rangeSpan;
}

export function sampleFunction(fn, a, b, count = 320) {
  const points = [];
  for (let index = 0; index <= count; index += 1) {
    const x = a + ((b - a) * index) / count;
    try {
      const y = fn(x);
      if (Number.isFinite(y)) {
        points.push({ x, y });
      }
    } catch (_error) {
      continue;
    }
  }
  return points;
}

export function buildSvgPath(points, sx, sy) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${sx(point.x)} ${sy(point.y)}`)
    .join(" ");
}

export function buildClosedAreaPath(points, sx, sy, baseline = 0) {
  if (!points.length) {
    return "";
  }

  const areaPoints = [
    { x: points[0].x, y: baseline },
    ...points,
    { x: points[points.length - 1].x, y: baseline }
  ];

  return `${buildSvgPath(areaPoints, sx, sy)} Z`;
}

function polygonPath(points, sx, sy) {
  return `${buildSvgPath(points, sx, sy)} Z`;
}

export function buildNodeSamples(fn, a, b, n) {
  const step = (b - a) / n;
  return Array.from({ length: n + 1 }, (_, index) => {
    const x = a + step * index;
    return { index, x, y: fn(x) };
  });
}

export function leftRectangleRule(fn, a, b, n) {
  const step = (b - a) / n;
  let sum = 0;
  for (let index = 0; index < n; index += 1) {
    sum += fn(a + step * index);
  }
  return sum * step;
}

export function rightRectangleRule(fn, a, b, n) {
  const step = (b - a) / n;
  let sum = 0;
  for (let index = 1; index <= n; index += 1) {
    sum += fn(a + step * index);
  }
  return sum * step;
}

export function midpointRule(fn, a, b, n) {
  const step = (b - a) / n;
  let sum = 0;
  for (let index = 0; index < n; index += 1) {
    sum += fn(a + (index + 0.5) * step);
  }
  return sum * step;
}

export function trapezoidRule(fn, a, b, n) {
  const step = (b - a) / n;
  let sum = 0.5 * (fn(a) + fn(b));
  for (let index = 1; index < n; index += 1) {
    sum += fn(a + step * index);
  }
  return sum * step;
}

export function simpsonRule(fn, a, b, n) {
  if (!Number.isInteger(n) || n <= 0 || n % 2 !== 0) {
    throw new Error("辛普森法要求偶数个子区间。");
  }

  const step = (b - a) / n;
  let sum = fn(a) + fn(b);

  for (let index = 1; index < n; index += 1) {
    sum += (index % 2 === 0 ? 2 : 4) * fn(a + step * index);
  }

  return (sum * step) / 3;
}

export function referenceIntegral(fn, a, b, resolution = 8192) {
  const safeResolution =
    Number.isInteger(resolution) && resolution > 0
      ? resolution % 2 === 0
        ? resolution
        : resolution + 1
      : 8192;

  return simpsonRule(fn, a, b, safeResolution);
}

export function numericSecondDerivative(fn, x, step = 1e-3) {
  return (fn(x + step) - 2 * fn(x) + fn(x - step)) / (step * step);
}

export function formatRatio(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (!Number.isFinite(value)) {
    return "极大";
  }
  return `${value.toFixed(2)}x`;
}

export function improvementRatio(previousError, nextError) {
  if (!Number.isFinite(previousError) || previousError <= 0) {
    return null;
  }
  if (nextError === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return previousError / nextError;
}

export function buildPlotGeometry(fn, a, b, options = {}) {
  const {
    width = 960,
    height = 500,
    margin = { top: 28, right: 28, bottom: 52, left: 60 },
    curveSamples = 360,
    xPaddingRatio = 0.06
  } = options;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const span = b - a || 1;
  const xPadding = Math.max(span * xPaddingRatio, 0.2);
  const xMin = a - xPadding;
  const xMax = b + xPadding;
  const curve = sampleFunction(fn, xMin, xMax, curveSamples);
  const yValues = curve.length ? curve.map((point) => point.y) : [0];
  const yMinRaw = Math.min(...yValues, 0);
  const yMaxRaw = Math.max(...yValues, 0);
  const yPadding = Math.max((yMaxRaw - yMinRaw) * 0.12, 0.24);
  const yMin = yMinRaw - yPadding;
  const yMax = yMaxRaw + yPadding;
  const sx = createLinearScale(xMin, xMax, margin.left, margin.left + plotWidth);
  const sy = createLinearScale(yMin, yMax, margin.top + plotHeight, margin.top);

  return {
    width,
    height,
    margin,
    plotWidth,
    plotHeight,
    xMin,
    xMax,
    yMin,
    yMax,
    sx,
    sy,
    curve
  };
}

export function buildRectangleShapes(fn, a, b, n, mode) {
  const step = (b - a) / n;
  return Array.from({ length: n }, (_, index) => {
    const x0 = a + index * step;
    const x1 = x0 + step;
    const sampleX =
      mode === "right" ? x1 : mode === "midpoint" ? x0 + step / 2 : x0;
    const height = fn(sampleX);
    return {
      index,
      x0,
      x1,
      y0: height,
      y1: height,
      sampleX,
      pathPoints: [
        { x: x0, y: 0 },
        { x: x0, y: height },
        { x: x1, y: height },
        { x: x1, y: 0 }
      ]
    };
  });
}

export function buildTrapezoidShapes(fn, a, b, n) {
  const step = (b - a) / n;
  return Array.from({ length: n }, (_, index) => {
    const x0 = a + index * step;
    const x1 = x0 + step;
    const y0 = fn(x0);
    const y1 = fn(x1);
    return {
      index,
      x0,
      x1,
      y0,
      y1,
      pathPoints: [
        { x: x0, y: 0 },
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x1, y: 0 }
      ]
    };
  });
}

export function buildQuadraticInterpolant(x0, y0, x1, y1, x2, y2) {
  return (x) => {
    const l0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2));
    const l1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2));
    const l2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1));
    return y0 * l0 + y1 * l1 + y2 * l2;
  };
}

export function buildSimpsonUnitShapes(fn, a, b, n, segments = 36) {
  const step = (b - a) / n;
  const units = [];
  for (let index = 0; index < n; index += 2) {
    const x0 = a + index * step;
    const x1 = x0 + step;
    const x2 = x0 + 2 * step;
    const y0 = fn(x0);
    const y1 = fn(x1);
    const y2 = fn(x2);
    const interpolant = buildQuadraticInterpolant(x0, y0, x1, y1, x2, y2);
    const curvePoints = [];
    for (let sampleIndex = 0; sampleIndex <= segments; sampleIndex += 1) {
      const x = x0 + ((x2 - x0) * sampleIndex) / segments;
      curvePoints.push({ x, y: interpolant(x) });
    }
    units.push({
      unitIndex: index / 2,
      x0,
      x1,
      x2,
      y0,
      y1,
      y2,
      interpolant,
      curvePoints
    });
  }
  return units;
}

export function renderShapePath(shape, sx, sy) {
  return polygonPath(shape.pathPoints, sx, sy);
}

export function renderCurveFill(points, sx, sy, baseline = 0) {
  return buildClosedAreaPath(points, sx, sy, baseline);
}

export function buildGapPolygon(fnA, fnB, x0, x1, segments = 60) {
  const upper = [];
  const lower = [];
  for (let index = 0; index <= segments; index += 1) {
    const x = x0 + ((x1 - x0) * index) / segments;
    upper.push({ x, y: fnA(x) });
  }
  for (let index = segments; index >= 0; index -= 1) {
    const x = x0 + ((x1 - x0) * index) / segments;
    lower.push({ x, y: fnB(x) });
  }
  return [...upper, ...lower];
}

export function buildLagrangeInterpolant(points) {
  const nodes = points.map((point) => point.x);
  const values = points.map((point) => point.y);
  const count = points.length;
  return (x) => {
    let sum = 0;
    for (let row = 0; row < count; row += 1) {
      let basis = 1;
      for (let column = 0; column < count; column += 1) {
        if (row !== column) {
          basis *= (x - nodes[column]) / (nodes[row] - nodes[column]);
        }
      }
      sum += values[row] * basis;
    }
    return sum;
  };
}

export function buildSinglePanelInterpolant(fn, a, b, order, samples = 240) {
  const nodes = buildNodeSamples(fn, a, b, order).map((node) => ({
    x: node.x,
    y: node.y
  }));
  const interpolant = buildLagrangeInterpolant(nodes);
  const curvePoints = sampleFunction(interpolant, a, b, samples);
  return {
    nodes,
    interpolant,
    curvePoints
  };
}

export function rombergTable(fn, a, b, depth) {
  const rows = [];
  const span = b - a;

  for (let row = 0; row < depth; row += 1) {
    const n = 2 ** row;
    const step = span / n;
    const midpointSamples = [];
    let midpointSum = 0;

    if (row > 0) {
      for (let index = 1; index <= 2 ** (row - 1); index += 1) {
        const x = a + (2 * index - 1) * step;
        const y = fn(x);
        midpointSamples.push({ x, y });
        midpointSum += y;
      }
    }

    const trapValue =
      row === 0
        ? 0.5 * span * (fn(a) + fn(b))
        : 0.5 * rows[row - 1][0].value + step * midpointSum;

    rows.push([
      {
        row,
        col: 0,
        n,
        value: trapValue,
        step,
        midpointSum,
        midpointSamples,
        orderLabel: "O(h^2)"
      }
    ]);
  }

  for (let row = 1; row < depth; row += 1) {
    for (let col = 1; col <= row; col += 1) {
      const factor = 4 ** col;
      const value =
        rows[row][col - 1].value +
        (rows[row][col - 1].value - rows[row - 1][col - 1].value) / (factor - 1);
      rows[row].push({
        row,
        col,
        n: 2 ** row,
        value,
        orderLabel: `O(h^${2 * (col + 1)})`
      });
    }
  }

  return rows;
}

export function flattenRombergSteps(table) {
  const steps = [];
  table.forEach((row, rowIndex) => {
    steps.push({ kind: "trap", row: rowIndex, col: 0, cell: row[0] });
    for (let col = 1; col < row.length; col += 1) {
      steps.push({ kind: "extrapolate", row: rowIndex, col, cell: row[col] });
    }
  });
  return steps;
}

export function computePartialTrapezoidAssembly(fn, a, b, n, unitCount) {
  const step = (b - a) / n;
  const weights = Array.from({ length: n + 1 }, () => 0);
  let partialArea = 0;

  for (let unit = 0; unit < unitCount; unit += 1) {
    const x0 = a + unit * step;
    const x1 = x0 + step;
    partialArea += 0.5 * step * (fn(x0) + fn(x1));
    weights[unit] += 0.5;
    weights[unit + 1] += 0.5;
  }

  return {
    step,
    weights,
    partialArea
  };
}

export function singlePanelClosedNewtonCotes(fn, a, b, rule) {
  const step = (b - a) / rule.order;
  let sum = 0;
  for (let index = 0; index <= rule.order; index += 1) {
    sum += rule.weights[index] * fn(a + index * step);
  }
  return sum * step;
}

export function compositeClosedNewtonCotes(fn, a, b, panels, rule) {
  const panelCount = Math.max(1, panels);
  const panelWidth = (b - a) / panelCount;
  let value = 0;

  for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
    const panelStart = a + panelIndex * panelWidth;
    value += singlePanelClosedNewtonCotes(fn, panelStart, panelStart + panelWidth, rule);
  }

  return {
    value,
    panelCount,
    totalSegments: panelCount * rule.order
  };
}
