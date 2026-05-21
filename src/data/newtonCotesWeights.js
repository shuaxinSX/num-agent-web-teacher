function absBigInt(value) {
  return value < 0n ? -value : value;
}

function gcdBigInt(left, right) {
  let a = absBigInt(left);
  let b = absBigInt(right);

  while (b !== 0n) {
    [a, b] = [b, a % b];
  }

  return a;
}

function lcmBigInt(left, right) {
  if (left === 0n || right === 0n) {
    return 0n;
  }

  return absBigInt((left / gcdBigInt(left, right)) * right);
}

function createFraction(numerator, denominator = 1n) {
  if (denominator === 0n) {
    throw new Error("分母不能为 0。");
  }

  let num = numerator;
  let den = denominator;

  if (den < 0n) {
    num = -num;
    den = -den;
  }

  if (num === 0n) {
    return { numerator: 0n, denominator: 1n };
  }

  const divisor = gcdBigInt(num, den);
  return {
    numerator: num / divisor,
    denominator: den / divisor
  };
}

function addFractions(left, right) {
  return createFraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function subtractFractions(left, right) {
  return createFraction(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator
  );
}

function multiplyFractions(left, right) {
  return createFraction(
    left.numerator * right.numerator,
    left.denominator * right.denominator
  );
}

function divideFractions(left, right) {
  return createFraction(
    left.numerator * right.denominator,
    left.denominator * right.numerator
  );
}

function fractionEquals(left, right) {
  return (
    left.numerator === right.numerator &&
    left.denominator === right.denominator
  );
}

function powerBigInt(base, exponent) {
  let result = 1n;

  for (let index = 0; index < exponent; index += 1) {
    result *= base;
  }

  return result;
}

function fractionToNumber(fraction) {
  return Number(fraction.numerator) / Number(fraction.denominator);
}

function fractionToText(fraction) {
  if (fraction.denominator === 1n) {
    return `${fraction.numerator}`;
  }

  return `${fraction.numerator}/${fraction.denominator}`;
}

function fractionToLatex(fraction) {
  if (fraction.denominator === 1n) {
    return `${fraction.numerator}`;
  }

  return String.raw`\frac{${fraction.numerator}}{${fraction.denominator}}`;
}

function multiplyPolynomialByLinear(polynomial, constantTerm, linearTerm) {
  const next = Array.from({ length: polynomial.length + 1 }, () => createFraction(0n));

  polynomial.forEach((coefficient, index) => {
    next[index] = addFractions(
      next[index],
      multiplyFractions(coefficient, constantTerm)
    );
    next[index + 1] = addFractions(
      next[index + 1],
      multiplyFractions(coefficient, linearTerm)
    );
  });

  return next;
}

function scalePolynomial(polynomial, scalar) {
  return polynomial.map((coefficient) => multiplyFractions(coefficient, scalar));
}

function buildLagrangeBasis(order, targetIndex) {
  let polynomial = [createFraction(1n)];

  for (let index = 0; index <= order; index += 1) {
    if (index === targetIndex) {
      continue;
    }

    polynomial = multiplyPolynomialByLinear(
      polynomial,
      createFraction(-BigInt(index)),
      createFraction(1n)
    );
    polynomial = scalePolynomial(
      polynomial,
      createFraction(1n, BigInt(targetIndex - index))
    );
  }

  return polynomial;
}

function integratePolynomial(polynomial, upperBound) {
  let sum = createFraction(0n);
  const upper = BigInt(upperBound);

  polynomial.forEach((coefficient, power) => {
    const integralFactor = createFraction(
      powerBigInt(upper, power + 1),
      BigInt(power + 1)
    );
    sum = addFractions(sum, multiplyFractions(coefficient, integralFactor));
  });

  return sum;
}

function buildMoment(order, power) {
  return createFraction(
    powerBigInt(BigInt(order), power + 1),
    BigInt(power + 1)
  );
}

function degreeOfPrecision(order, weightFractions) {
  let precision = -1;

  for (let power = 0; power <= 2 * order + 4; power += 1) {
    let discreteMoment = createFraction(0n);

    weightFractions.forEach((weight, index) => {
      discreteMoment = addFractions(
        discreteMoment,
        multiplyFractions(weight, createFraction(powerBigInt(BigInt(index), power)))
      );
    });

    if (!fractionEquals(discreteMoment, buildMoment(order, power))) {
      break;
    }

    precision = power;
  }

  return precision;
}

function buildMonomialChecks(order, weightFractions, maxPower) {
  return Array.from({ length: maxPower + 1 }, (_, power) => {
    let discreteMoment = createFraction(0n);

    weightFractions.forEach((weight, index) => {
      discreteMoment = addFractions(
        discreteMoment,
        multiplyFractions(weight, createFraction(powerBigInt(BigInt(index), power)))
      );
    });

    const exactMoment = buildMoment(order, power);
    const residual = subtractFractions(discreteMoment, exactMoment);

    return {
      power,
      isExact: fractionEquals(discreteMoment, exactMoment),
      residual: fractionToNumber(residual)
    };
  });
}

function buildCommonFactor(weightFractions) {
  const commonDenominator = weightFractions.reduce(
    (value, fraction) => lcmBigInt(value, fraction.denominator),
    1n
  );
  const scaledNumerators = weightFractions.map(
    (fraction) => fraction.numerator * (commonDenominator / fraction.denominator)
  );
  const factorNumerator = scaledNumerators.reduce(
    (value, numerator) =>
      value === 0n ? absBigInt(numerator) : gcdBigInt(value, numerator),
    0n
  );
  const commonFactor = createFraction(factorNumerator, commonDenominator);

  return {
    commonFactor,
    integerWeights: scaledNumerators.map((numerator) => Number(numerator / factorNumerator))
  };
}

function formatCommonFactorWithH(factor) {
  if (factor.denominator === 1n) {
    return `${factor.numerator}h`;
  }

  if (factor.numerator === 1n) {
    return String.raw`\frac{h}{${factor.denominator}}`;
  }

  return String.raw`\frac{${factor.numerator}h}{${factor.denominator}}`;
}

function formatExactRuleLatex(order, commonFactor, integerWeights) {
  const terms = integerWeights
    .map((weight, index) => {
      const factor = weight === 1 ? "" : `${weight}`;
      return `${factor}f(x_${index})`;
    })
    .join("+");

  return String.raw`\int_a^b f(x)\,\mathrm{d}x \approx ${formatCommonFactorWithH(
    commonFactor
  )}\left[${terms}\right],\qquad h=\frac{b-a}{${order}}`;
}

function displayName(order) {
  if (order === 1) {
    return "梯形";
  }
  if (order === 2) {
    return "Simpson 1/3";
  }
  if (order === 3) {
    return "Simpson 3/8";
  }
  if (order === 4) {
    return "Boole";
  }

  return `闭型 NC (m=${order})`;
}

function buildRule(order) {
  const weightFractions = Array.from({ length: order + 1 }, (_, index) =>
    integratePolynomial(buildLagrangeBasis(order, index), order)
  );
  const precision = degreeOfPrecision(order, weightFractions);
  const { commonFactor, integerWeights } = buildCommonFactor(weightFractions);
  const weights = weightFractions.map(fractionToNumber);
  const lambda = weights.reduce((sum, weight) => sum + Math.abs(weight), 0);
  const maxWeight = Math.max(...weights.map((weight) => Math.abs(weight)));
  const negativeCount = weights.filter((weight) => weight < 0).length;

  return {
    order,
    nodeCount: order + 1,
    name: displayName(order),
    weights,
    weightFractions: weightFractions.map((fraction) => ({
      numerator: `${fraction.numerator}`,
      denominator: `${fraction.denominator}`,
      text: fractionToText(fraction),
      latex: fractionToLatex(fraction)
    })),
    commonFactor: {
      numerator: `${commonFactor.numerator}`,
      denominator: `${commonFactor.denominator}`,
      text: fractionToText(commonFactor),
      latex: fractionToLatex(commonFactor)
    },
    integerWeights,
    exactFormulaLatex: formatExactRuleLatex(order, commonFactor, integerWeights),
    degreeOfPrecision: precision,
    singlePanelErrorOrder: precision + 2,
    compositeErrorOrder: precision + 1,
    globalErrorOrder: precision + 1,
    lambda,
    maxWeight,
    negativeCount,
    hasNegativeWeights: negativeCount > 0,
    monomialChecks: buildMonomialChecks(order, weightFractions, Math.max(order + 2, precision + 2))
  };
}

export const closedNewtonCotesRules = Array.from({ length: 10 }, (_, index) =>
  buildRule(index + 1)
);

export function getClosedNewtonCotesRule(order) {
  return closedNewtonCotesRules.find((rule) => rule.order === order) || buildRule(order);
}
