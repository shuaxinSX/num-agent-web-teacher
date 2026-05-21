import {
  referenceIntegral,
  simpsonRule,
  singlePanelClosedNewtonCotes,
  trapezoidRule
} from "./lessonMath.js";
import { getClosedNewtonCotesRule } from "../data/newtonCotesWeights.js";

const methodRequirements = {
  trapezoid: {
    multiple: 1,
    inputLabel: "总子区间数 N",
    summaryLabel: "总子区间数 N",
    hint: "复合梯形法接受任意正整数总子区间数 N。"
  },
  simpson: {
    multiple: 2,
    inputLabel: "总子区间数 N",
    summaryLabel: "总子区间数 N",
    hint: "复合辛普森法要求总子区间数 N 为偶数。"
  },
  "newton-cotes": {
    multiple: 1,
    inputLabel: "单面板子区间数 m",
    summaryLabel: "单面板子区间数 m",
    hint: "当前实验区把输入解释为单面板子区间数 m，并据此生成对应的闭型 Newton–Cotes 规则。"
  }
};

const functionNames = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sqrt",
  "log",
  "exp",
  "abs"
]);

const latexFunctionNames = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sqrt",
  "log",
  "exp"
]);

function normalizeSymbol(value) {
  return value
    .replace(/π/g, "pi")
    .replace(/×|·/g, "*")
    .replace(/÷/g, "/")
    .replace(/−|–|—/g, "-");
}

function tokenizeExpression(expression) {
  const source = normalizeSymbol(expression);
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "\\") {
      let nextIndex = index + 1;
      while (nextIndex < source.length && /[a-z]/i.test(source[nextIndex])) {
        nextIndex += 1;
      }

      const name = source.slice(index + 1, nextIndex).toLowerCase();
      if (!name) {
        throw new Error("表达式中包含无法识别的转义符。");
      }

      if (name === "ln") {
        tokens.push({ type: "function", value: "log" });
      } else if (name === "pi") {
        tokens.push({ type: "constant", value: "PI" });
      } else if (functionNames.has(name)) {
        tokens.push({ type: "function", value: name });
      } else {
        throw new Error(`暂不支持函数 \\${name}`);
      }

      index = nextIndex;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let nextIndex = index + 1;
      while (nextIndex < source.length && /[0-9.]/.test(source[nextIndex])) {
        nextIndex += 1;
      }

      tokens.push({
        type: "number",
        value: source.slice(index, nextIndex)
      });
      index = nextIndex;
      continue;
    }

    if (/[a-z]/i.test(char)) {
      let nextIndex = index + 1;
      while (nextIndex < source.length && /[a-z]/i.test(source[nextIndex])) {
        nextIndex += 1;
      }

      const name = source.slice(index, nextIndex).toLowerCase();
      if (name === "x") {
        tokens.push({ type: "variable", value: "x" });
      } else if (name === "pi") {
        tokens.push({ type: "constant", value: "PI" });
      } else if (name === "e") {
        tokens.push({ type: "constant", value: "E" });
      } else if (name === "ln") {
        tokens.push({ type: "function", value: "log" });
      } else if (functionNames.has(name)) {
        tokens.push({ type: "function", value: name });
      } else {
        throw new Error(`暂不支持标识符 ${name}`);
      }

      index = nextIndex;
      continue;
    }

    if (char === "*" && source[index + 1] === "*") {
      tokens.push({ type: "operator", value: "**" });
      index += 2;
      continue;
    }

    if ("+-*/^(),".includes(char)) {
      tokens.push({
        type:
          char === "("
            ? "lparen"
            : char === ")"
              ? "rparen"
              : "operator",
        value: char === "^" ? "**" : char
      });
      index += 1;
      continue;
    }

    throw new Error(`表达式中包含无法识别的字符：${char}`);
  }

  return tokens;
}

function shouldInsertImplicitMultiply(leftToken, rightToken) {
  if (!leftToken || !rightToken) {
    return false;
  }

  const leftTypes = new Set(["number", "variable", "constant", "rparen"]);
  const rightTypes = new Set(["number", "variable", "constant", "function", "lparen"]);

  return leftTypes.has(leftToken.type) && rightTypes.has(rightToken.type);
}

function normalizeTokens(expression) {
  const tokens = tokenizeExpression(expression);
  const normalizedTokens = [];

  tokens.forEach((token, index) => {
    normalizedTokens.push(token);

    if (shouldInsertImplicitMultiply(token, tokens[index + 1])) {
      normalizedTokens.push({ type: "operator", value: "*" });
    }
  });

  return normalizedTokens;
}

function describeToken(token) {
  if (!token) {
    return "输入末尾";
  }

  if (token.type === "number") {
    return `数字 ${token.value}`;
  }

  if (token.type === "variable") {
    return "变量 x";
  }

  if (token.type === "constant") {
    return token.value === "PI" ? "常量 pi" : "常量 e";
  }

  if (token.type === "function") {
    return `函数 ${token.value}`;
  }

  if (token.type === "lparen") {
    return "(";
  }

  if (token.type === "rparen") {
    return ")";
  }

  return token.value;
}

function parseExpressionToAst(expression) {
  const tokens = normalizeTokens(expression);
  let index = 0;

  function peek(offset = 0) {
    return tokens[index + offset] || null;
  }

  function matchOperator(...operators) {
    const token = peek();
    if (token?.type === "operator" && operators.includes(token.value)) {
      index += 1;
      return token.value;
    }
    return null;
  }

  function parsePrimary() {
    const token = peek();

    if (!token) {
      throw new Error("表达式不完整。");
    }

    if (token.type === "number") {
      index += 1;
      const value = Number(token.value);
      if (!Number.isFinite(value)) {
        throw new Error(`数字 ${token.value} 格式不正确。`);
      }
      return { type: "number", value };
    }

    if (token.type === "variable") {
      index += 1;
      return { type: "variable" };
    }

    if (token.type === "constant") {
      index += 1;
      return { type: "constant", value: token.value };
    }

    if (token.type === "function") {
      index += 1;
      let argument = null;

      if (peek()?.type === "lparen") {
        index += 1;
        argument = parseAdditive();
        if (peek()?.type !== "rparen") {
          throw new Error(`函数 ${token.value} 缺少右括号。`);
        }
        index += 1;
      } else {
        argument = parseUnary();
      }

      return {
        type: "call",
        name: token.value,
        argument
      };
    }

    if (token.type === "lparen") {
      index += 1;
      const node = parseAdditive();
      if (peek()?.type !== "rparen") {
        throw new Error("表达式缺少右括号。");
      }
      index += 1;
      return node;
    }

    throw new Error(`无法在 ${describeToken(token)} 附近开始解析表达式。`);
  }

  function parsePower() {
    let node = parsePrimary();

    if (matchOperator("**")) {
      node = {
        type: "binary",
        operator: "**",
        left: node,
        right: parseUnary()
      };
    }

    return node;
  }

  function parseUnary() {
    const operator = matchOperator("+", "-");
    if (operator) {
      return {
        type: "unary",
        operator,
        argument: parseUnary()
      };
    }
    return parsePower();
  }

  function parseMultiplicative() {
    let node = parseUnary();
    while (true) {
      const operator = matchOperator("*", "/");
      if (!operator) {
        break;
      }
      node = {
        type: "binary",
        operator,
        left: node,
        right: parseUnary()
      };
    }
    return node;
  }

  function parseAdditive() {
    let node = parseMultiplicative();
    while (true) {
      const operator = matchOperator("+", "-");
      if (!operator) {
        break;
      }
      node = {
        type: "binary",
        operator,
        left: node,
        right: parseMultiplicative()
      };
    }
    return node;
  }

  if (tokens.length === 0) {
    throw new Error("表达式不能为空。");
  }

  const ast = parseAdditive();
  if (index < tokens.length) {
    throw new Error(`无法解析 ${describeToken(peek())} 附近的表达式。`);
  }
  return ast;
}

function evaluateAst(node, x) {
  if (node.type === "number") {
    return node.value;
  }

  if (node.type === "variable") {
    return x;
  }

  if (node.type === "constant") {
    return node.value === "PI" ? Math.PI : Math.E;
  }

  if (node.type === "unary") {
    const value = evaluateAst(node.argument, x);
    return node.operator === "-" ? -value : value;
  }

  if (node.type === "binary") {
    const left = evaluateAst(node.left, x);
    const right = evaluateAst(node.right, x);

    if (node.operator === "+") {
      return left + right;
    }

    if (node.operator === "-") {
      return left - right;
    }

    if (node.operator === "*") {
      return left * right;
    }

    if (node.operator === "/") {
      return left / right;
    }

    return left ** right;
  }

  return Math[node.name](evaluateAst(node.argument, x));
}

function buildMathFunction(expression, _argName = "x") {
  const ast = parseExpressionToAst(expression);
  return (x) => evaluateAst(ast, x);
}

function astContainsVariable(node) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (node.type === "variable") {
    return true;
  }

  if (node.type === "unary") {
    return astContainsVariable(node.argument);
  }

  if (node.type === "binary") {
    return astContainsVariable(node.left) || astContainsVariable(node.right);
  }

  if (node.type === "call") {
    return astContainsVariable(node.argument);
  }

  return false;
}

function assertFinite(value, message) {
  if (!Number.isFinite(value)) {
    throw new Error(message);
  }
}

export function parseScalar(text) {
  const ast = parseExpressionToAst(text);
  if (astContainsVariable(ast)) {
    throw new Error("区间端点必须是常量表达式，不能包含变量 x。");
  }

  const evaluator = (x) => evaluateAst(ast, x);
  const value = evaluator(0);
  assertFinite(value, "区间端点必须能计算出有限数值。");
  return Number(value);
}

export function parseDirectedInterval(aText, bText) {
  const start = parseScalar(aText);
  const end = parseScalar(bText);

  if (start === end) {
    throw new Error("积分区间不能退化成一个点。");
  }

  return {
    start,
    end,
    direction: end > start ? 1 : -1,
    lower: Math.min(start, end),
    upper: Math.max(start, end)
  };
}

export function compileExpression(expression) {
  const evaluator = buildMathFunction(expression, "x");
  return (x) => {
    const result = evaluator(x);
    assertFinite(result, "函数在采样点上返回了非有限值，请调整表达式或区间。");
    return Number(result);
  };
}

function convertTokenToLatex(token) {
  if (token.type === "constant") {
    return token.value === "PI" ? "\\pi" : "e";
  }

  if (token.type === "function") {
    if (token.value === "sqrt") {
      return "\\sqrt";
    }

    if (latexFunctionNames.has(token.value)) {
      return `\\${token.value}`;
    }
  }

  if (token.type === "operator" && token.value === "**") {
    return "^";
  }

  return token.value;
}

export function formatExpressionAsLatex(expression) {
  const tokens = tokenizeExpression(expression);
  const latexParts = [];

  tokens.forEach((token, index) => {
    const leftToken = tokens[index - 1];
    const rightToken = tokens[index + 1];

    if (index > 0 && shouldInsertImplicitMultiply(leftToken, token)) {
      latexParts.push("\\cdot ");
    }

    if (token.type === "operator" && token.value === "**") {
      latexParts.push("^");
      return;
    }

    if (token.type === "function" && token.value === "sqrt" && rightToken?.type === "lparen") {
      latexParts.push("\\sqrt");
      return;
    }

    latexParts.push(convertTokenToLatex(token));
  });

  return latexParts.join("");
}

export function getMethodRequirement(methodId) {
  return methodRequirements[methodId] || methodRequirements.trapezoid;
}

function buildPreviewData(fn, a, b, n) {
  const sampleCount = 180;
  const samples = [];
  const nodes = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const x = a + ((b - a) * index) / sampleCount;
    try {
      const y = fn(x);
      if (Number.isFinite(y)) {
        samples.push({ x, y });
      }
    } catch (_error) {
      continue;
    }
  }

  for (let index = 0; index <= n; index += 1) {
    const x = a + ((b - a) * index) / n;
    nodes.push({ x, y: fn(x) });
  }

  return { samples, nodes };
}

function formatIntervalNote(interval) {
  if (interval.direction > 0) {
    return "结果同时给出一个高精参考值，用于误差比较。";
  }

  return "输入区间是降序，结果仍按有向积分返回；图像预览按升序区间绘制。";
}

export function runNumericalExperiment({
  methodId,
  expression,
  aText,
  bText,
  nText
}) {
  const requirement = getMethodRequirement(methodId);
  const fn = compileExpression(expression);
  const interval = parseDirectedInterval(aText, bText);
  const n = Number.parseInt(nText, 10);

  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${requirement.summaryLabel} 必须是正整数。`);
  }

  if (n % requirement.multiple !== 0) {
    throw new Error(requirement.hint);
  }

  let approximation = 0;
  if (methodId === "trapezoid") {
    approximation = trapezoidRule(fn, interval.start, interval.end, n);
  } else if (methodId === "simpson") {
    approximation = simpsonRule(fn, interval.start, interval.end, n);
  } else {
    const rule = getClosedNewtonCotesRule(n);
    approximation = singlePanelClosedNewtonCotes(fn, interval.start, interval.end, rule);
  }

  const reference = referenceIntegral(fn, interval.start, interval.end, 4096);

  return {
    approximation,
    reference,
    absoluteError: Math.abs(reference - approximation),
    note: formatIntervalNote(interval),
    preview: buildPreviewData(fn, interval.lower, interval.upper, n),
    parameterLabel: requirement.summaryLabel,
    parameterValue: n,
    orientedInput: {
      a: interval.start,
      b: interval.end,
      n
    },
    plotInterval: {
      a: interval.lower,
      b: interval.upper,
      n
    }
  };
}

export function formatMetric(value) {
  if (!Number.isFinite(value)) {
    return "NaN";
  }

  const absolute = Math.abs(value);
  if ((absolute !== 0 && absolute < 1e-4) || absolute >= 1e5) {
    return value.toExponential(4);
  }

  return value.toFixed(4);
}

export function generateNiceTicks(min, max, maxTicks = 5) {
  const span = max - min;
  if (span <= 0) return [min];

  const rawStep = span / maxTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;

  let step;
  if (residual > 5) step = 10 * magnitude;
  else if (residual > 2) step = 5 * magnitude;
  else if (residual > 1) step = 2 * magnitude;
  else step = magnitude;

  const niceMin = Math.ceil(min / step) * step;
  const niceMax = Math.floor(max / step) * step;

  const ticks = [];
  for (let val = niceMin; val <= niceMax + 1e-9; val += step) {
    ticks.push(val);
  }

  if (ticks.length === 0) return [min, max];
  return ticks;
}
