import { referenceIntegral } from "../utils/lessonMath";

const CONTROL_POINTS = [
  { x: 0, y: 1.82 },
  { x: 0.55, y: 2.05 },
  { x: 1.1, y: 2.48 },
  { x: 1.7, y: 3.28 },
  { x: 2.2, y: 3.42 },
  { x: 2.75, y: 2.84 },
  { x: 3.1, y: 1.76 },
  { x: 3.55, y: 2.08 },
  { x: 4.12, y: 2.47 },
  { x: 4.78, y: 3.52 },
  { x: 5.08, y: 3.74 },
  { x: 5.55, y: 2.66 },
  { x: 6.15, y: 2.12 },
  { x: 6.86, y: 1.58 },
  { x: 7.38, y: 1.86 },
  { x: 7.9, y: 1.72 },
  { x: 8.36, y: 1.36 },
  { x: 8.82, y: 1.64 },
  { x: 9.36, y: 2.08 },
  { x: 10, y: 2.42 }
];

function sign(value) {
  if (value > 0) {
    return 1;
  }
  if (value < 0) {
    return -1;
  }
  return 0;
}

function computeEndpointSlope(h0, h1, delta0, delta1) {
  let slope = ((2 * h0 + h1) * delta0 - h0 * delta1) / (h0 + h1);
  if (sign(slope) !== sign(delta0)) {
    slope = 0;
  } else if (sign(delta0) !== sign(delta1) && Math.abs(slope) > Math.abs(3 * delta0)) {
    slope = 3 * delta0;
  }
  return slope;
}

function buildPchipEvaluator(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const count = points.length;
  const h = [];
  const delta = [];

  for (let index = 0; index < count - 1; index += 1) {
    const width = xs[index + 1] - xs[index];
    h.push(width);
    delta.push((ys[index + 1] - ys[index]) / width);
  }

  const slopes = new Array(count).fill(0);
  slopes[0] = computeEndpointSlope(h[0], h[1], delta[0], delta[1]);
  slopes[count - 1] = computeEndpointSlope(
    h[count - 2],
    h[count - 3],
    delta[count - 2],
    delta[count - 3]
  );

  for (let index = 1; index < count - 1; index += 1) {
    if (delta[index - 1] === 0 || delta[index] === 0 || sign(delta[index - 1]) !== sign(delta[index])) {
      slopes[index] = 0;
      continue;
    }

    const w1 = 2 * h[index] + h[index - 1];
    const w2 = h[index] + 2 * h[index - 1];
    slopes[index] =
      (w1 + w2) / (w1 / delta[index - 1] + w2 / delta[index]);
  }

  return (x) => {
    if (x <= xs[0]) {
      return ys[0];
    }
    if (x >= xs[count - 1]) {
      return ys[count - 1];
    }

    let interval = 0;
    while (interval < count - 2 && x > xs[interval + 1]) {
      interval += 1;
    }

    const width = h[interval];
    const t = (x - xs[interval]) / width;
    const t2 = t * t;
    const t3 = t2 * t;
    const y0 = ys[interval];
    const y1 = ys[interval + 1];
    const m0 = slopes[interval];
    const m1 = slopes[interval + 1];

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return h00 * y0 + h10 * width * m0 + h01 * y1 + h11 * width * m1;
  };
}

const evaluate = buildPchipEvaluator(CONTROL_POINTS);
const referenceArea = referenceIntegral(evaluate, 0, 10, 16384);

export const greatWallProfile = {
  id: "great-wall",
  label: "秦长城轮廓",
  domain: [0, 10],
  controlPoints: CONTROL_POINTS,
  referenceLabel: "高精参考值",
  evaluate,
  sample(count = 320) {
    const [a, b] = this.domain;
    const points = [];
    for (let index = 0; index <= count; index += 1) {
      const x = a + ((b - a) * index) / count;
      points.push({ x, y: evaluate(x) });
    }
    return points;
  },
  integralReference() {
    return referenceArea;
  }
};
