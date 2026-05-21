import { useEffect, useMemo, useRef, useState } from "react";
import { InlineMathText } from "./InlineMathText";
import "./toolPages.css";

const TONES = {
  sage: {
    border: "rgba(16, 163, 127, 0.24)",
    soft: "rgba(16, 163, 127, 0.1)",
    solid: "#0f8d6d",
    text: "#0f5f4d"
  },
  blue: {
    border: "rgba(59, 130, 246, 0.24)",
    soft: "rgba(59, 130, 246, 0.1)",
    solid: "#2b6adf",
    text: "#224d95"
  },
  amber: {
    border: "rgba(245, 158, 11, 0.24)",
    soft: "rgba(245, 158, 11, 0.12)",
    solid: "#d08807",
    text: "#8a5a04"
  },
  rose: {
    border: "rgba(236, 72, 153, 0.24)",
    soft: "rgba(236, 72, 153, 0.1)",
    solid: "#d0337f",
    text: "#8b2458"
  },
  slate: {
    border: "rgba(107, 114, 128, 0.18)",
    soft: "rgba(107, 114, 128, 0.08)",
    solid: "#4b5563",
    text: "#374151"
  }
};

const shellCardStyle = {
  background: "linear-gradient(180deg, rgba(255,255,253,0.94) 0%, rgba(252,252,248,0.84) 100%)",
  border: "1px solid rgba(31, 31, 26, 0.08)",
  borderRadius: 24,
  boxShadow: "0 18px 36px -30px rgba(28, 32, 24, 0.28)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)"
};

const questionCardStyle = {
  padding: "16px 18px",
  borderRadius: 18,
  background: "rgba(250, 250, 245, 0.92)",
  border: "1px solid rgba(31, 31, 26, 0.06)",
  display: "grid",
  gap: 12
};

const confidenceOptions = [
  { value: "很有把握", description: "我能独立完成大部分拉格朗日插值题。", score: 5 },
  { value: "比较有把握", description: "常规题基本能做，但解释还不够稳。", score: 4 },
  { value: "一般", description: "做题时还需要边想边确认。", score: 3 },
  { value: "不太有把握", description: "只要题目一变形，我就容易乱。", score: 2 },
  { value: "几乎没把握", description: "目前还没有形成稳定方法。", score: 1 }
];

const anxietyOptions = [
  { value: "很轻松", description: "做课后反馈时比较放松。", score: 1 },
  { value: "略有压力", description: "有一点紧张，但还能推进。", score: 2 },
  { value: "有点紧张", description: "会担心自己解释不清。", score: 3 },
  { value: "比较紧张", description: "一到解释或迁移题就容易卡住。", score: 4 },
  { value: "很紧张", description: "看到相关题就会明显焦虑。", score: 5 }
];

const readinessOptions = [
  {
    value: "我能先判断该从哪个基函数或哪个性质切入",
    description: "面对新题时，能先找到切入口。",
    score: 5
  },
  {
    value: "我大致知道方向，但解释链条常常不完整",
    description: "能开始做，但解释容易断。",
    score: 4
  },
  {
    value: "我通常先套公式，再看结果是否合理",
    description: "更像先做再判断。",
    score: 3
  },
  {
    value: "我常常不知道该先看节点、误差还是方法",
    description: "遇到新情境时容易失去方向。",
    score: 2
  }
];

const supportOptions = [
  { value: "一个最小例题", description: "希望先看一个最短、最清楚的例子。" },
  { value: "一步一步的构造提示", description: "更需要按步骤拆开提示。" },
  { value: "节点与误差对比图", description: "想先通过图像理解为什么会振荡。" },
  { value: "老师集中讲解一次", description: "希望先听清楚再做。" }
];

const roleOptionMap = {
  "讲解思路": { value: "讲解", exportValue: "讲解" },
  "构造公式": { value: "构造", exportValue: "构造" },
  "检查节点与图像": { value: "验证", exportValue: "验证" },
  "整理比较结论": { value: "整理", exportValue: "组织" },
  "组织同伴讨论": { value: "组织", exportValue: "组织" }
};

const roleLabelMap = Object.fromEntries(
  Object.entries(roleOptionMap).map(([label, config]) => [config.value, label])
);

const roleExportMap = Object.fromEntries(
  Object.values(roleOptionMap).map((config) => [config.value, config.exportValue])
);

const roleChoiceOptions = Object.entries(roleOptionMap).map(([label, config]) => ({
  value: config.value,
  label,
  description: "可用于课后讨论或讲评中的分工。"
}));

const collaborationModeOptions = [
  { value: "先自己解释，再交流", description: "先独立表述，再听别人的解释。" },
  { value: "边做边讨论", description: "希望在讨论中修正想法。" },
  { value: "先听别人讲，再自己整理", description: "先借助同伴讲解，再归纳。" },
  { value: "负责检查与总结", description: "更愿意做验证、比对和总结。" }
];

const reflectionOptions = {
  stuck: [
    { value: "构造基函数时容易漏因子或写错分母", description: "更偏向构造能力问题。" },
    { value: "能写出式子，但说不清为什么经过节点", description: "更偏向性质理解问题。" },
    { value: "知道插值成立，但解释不清为什么端点会振荡", description: "更偏向误差机制问题。" },
    { value: "迁移到新情境时不会判断方法是否合适", description: "更偏向方法判断问题。" },
    { value: "基本没有明显困难", description: "整体较顺畅。" }
  ],
  check: [
    { value: "我主动点过验证或对比后再检查", description: "有显式的验证行为。" },
    { value: "我简单看过一遍答案", description: "有回看，但不深入。" },
    { value: "我基本没检查就提交了", description: "缺少验证动作。" }
  ],
  calibration: [
    { value: "结果和我预想差不多", description: "自我判断较稳定。" },
    { value: "我高估了自己", description: "需要做自评校准。" },
    { value: "我低估了自己", description: "表现比预想更好。" }
  ]
};

const practiceQuestions = [
  {
    id: "basis",
    label: "构造能力",
    title: "题1 基函数构造题",
    prompt:
      "给定三个互异节点 \\(x_0,x_1,x_2\\)，下列哪一个是 \\(L_1(x)\\) 的正确表达式？",
    options: [
      {
        value: "linear-only",
        label: "\\(L_1(x)=\\frac{x-x_0}{x_1-x_0}\\)",
        description: "只保留了一项，忽略了第三个节点。"
      },
      {
        value: "correct",
        label:
          "\\(L_1(x)=\\frac{(x-x_0)(x-x_2)}{(x_1-x_0)(x_1-x_2)}\\)",
        description: "在 \\(x_1\\) 处取 1，其余两个节点处取 0。"
      },
      {
        value: "l0",
        label:
          "\\(L_1(x)=\\frac{(x-x_1)(x-x_2)}{(x_0-x_1)(x_0-x_2)}\\)",
        description: "这是 \\(L_0(x)\\) 的结构。"
      },
      {
        value: "wrong-denominator",
        label: "\\(L_1(x)=\\frac{x_1-x}{x_2-x_0}\\)",
        description: "分子分母都不满足节点消失条件。"
      }
    ]
  },
  {
    id: "property",
    label: "性质与唯一性理解",
    title: "题2 节点性质与唯一性判断题",
    prompt:
      "要完整说明为什么 \\(P_n(x_i)=y_i\\) 且插值多项式唯一，应选出哪些正确关系？（可多选）",
    options: [
      {
        value: "self-one",
        label: "\\(L_i(x_i)=1\\)",
        description: "当前基函数在自己的节点处取 1。"
      },
      {
        value: "others-zero",
        label: "\\(L_k(x_i)=0\\,(k\\neq i)\\)",
        description: "其他基函数在 \\(x_i\\) 处都消失。"
      },
      {
        value: "interpolation",
        label: "因此 \\(P_n(x_i)=y_i\\)",
        description: "由前两条可推出插值条件成立。"
      },
      {
        value: "uniqueness",
        label:
          "若另一次数不超过 \\(n\\) 的多项式在这些节点也取相同值，则它与 \\(P_n\\) 必相同",
        description: "利用差多项式零点个数超过次数来说明唯一性。"
      },
      {
        value: "same-degree",
        label: "只要次数一样，唯一性就自动成立",
        description: "这是错误的推理。"
      }
    ]
  },
  {
    id: "runge",
    label: "误差与节点机制理解",
    title: "题3 龙格现象解释题",
    prompt:
      "当等距节点很多时，高次 Lagrange 插值在区间端点附近容易振荡，最关键的解释是：",
    options: [
      {
        value: "condition-fails",
        label: "插值条件失效了，所以曲线不再经过节点",
        description: "把“插值成立”与“逼近稳定”混淆了。"
      },
      {
        value: "global-sensitive",
        label: "全局高次多项式对节点分布敏感，等距节点会放大端点误差",
        description: "这是对 Runge 现象的核心解释。"
      },
      {
        value: "not-polynomial",
        label: "因为基函数其实不是多项式",
        description: "这是错误前提。"
      },
      {
        value: "more-nodes-always-better",
        label: "节点越多一定越稳定，只是这次算错了",
        description: "把“节点更多”简单等同于“效果更好”。"
      }
    ]
  },
  {
    id: "transfer",
    label: "迁移与方法判断能力",
    title: "题4 新情境方法判断题",
    prompt:
      "面对很多不等距实验点且局部变化剧烈的数据，你更应采取哪种思路？",
    options: [
      {
        value: "higher-global",
        label: "直接提高次数，继续用一个全局 Lagrange 多项式解决",
        description: "忽视节点分布与局部变化风险。"
      },
      {
        value: "optimize-or-piecewise",
        label: "先判断节点分布与误差风险，必要时换节点策略或分段方法",
        description: "这是更稳健的方法判断。"
      },
      {
        value: "only-pass-nodes",
        label: "只要经过所有节点就够了，不必考虑逼近质量",
        description: "只盯插值条件，不看实际效果。"
      },
      {
        value: "give-up",
        label: "图像一复杂就不适合任何插值方法",
        description: "结论过头。"
      }
    ]
  }
];

const dimensionLabels = {
  construct: "构造能力",
  property: "性质与唯一性理解",
  runge: "误差与节点机制理解",
  transfer: "迁移与方法判断能力"
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundOne(value) {
  return Number(value.toFixed(1));
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds.toString().padStart(2, "0")}秒`;
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function createEmptyForm() {
  return {
    selfReport: {
      confidence: "",
      anxiety: "",
      readiness: "",
      support: ""
    },
    practice: {
      basis: "",
      property: [],
      runge: "",
      transfer: ""
    },
    reflection: {
      stuck: "",
      check: "",
      calibration: ""
    },
    expression: {
      roles: [],
      mode: "",
      reason: "",
      tip: ""
    }
  };
}

function createDemoForm() {
  return {
    selfReport: {
      confidence: "比较有把握",
      anxiety: "略有压力",
      readiness: "我大致知道方向，但解释链条常常不完整",
      support: "节点与误差对比图"
    },
    practice: {
      basis: "correct",
      property: ["self-one", "others-zero", "interpolation"],
      runge: "global-sensitive",
      transfer: "optimize-or-piecewise"
    },
    reflection: {
      stuck: "知道插值成立，但解释不清为什么端点会振荡",
      check: "我主动点过验证或对比后再检查",
      calibration: "我高估了自己"
    },
    expression: {
      roles: ["讲解", "验证"],
      mode: "先自己解释，再交流",
      reason:
        "因为在第 i 个节点处，只有对应基函数取 1，其他基函数都为 0，所以最后只会留下 y_i 那一项。",
      tip:
        "不要只盯着经过节点，还要看节点分布和端点误差；等距节点多时要警惕龙格现象。"
    }
  };
}

function evaluatePractice(practice) {
  const basisResult = (() => {
    if (practice.basis === "correct") {
      return { id: "basis", label: "构造能力", score: 9.2, errorType: "正确", correct: true };
    }

    if (practice.basis === "linear-only") {
      return {
        id: "basis",
        label: "构造能力",
        score: 5.3,
        errorType: "基函数遗漏因子",
        correct: false
      };
    }

    if (practice.basis === "l0") {
      return {
        id: "basis",
        label: "构造能力",
        score: 4.8,
        errorType: "概念混淆",
        correct: false
      };
    }

    if (practice.basis === "wrong-denominator") {
      return {
        id: "basis",
        label: "构造能力",
        score: 4.2,
        errorType: "公式误用",
        correct: false
      };
    }

    return { id: "basis", label: "构造能力", score: 0, errorType: "未作答", correct: false };
  })();

  const propertyResult = (() => {
    const selected = practice.property || [];
    const correctSet = new Set(["self-one", "others-zero", "interpolation", "uniqueness"]);
    const correctCount = selected.filter((item) => correctSet.has(item)).length;
    const pickedWrong = selected.includes("same-degree");

    if (correctCount === 4 && !pickedWrong) {
      return {
        id: "property",
        label: "性质与唯一性理解",
        score: 9.1,
        errorType: "正确",
        correct: true
      };
    }

    if (pickedWrong) {
      return {
        id: "property",
        label: "性质与唯一性理解",
        score: correctCount >= 2 ? 4.8 : 4.1,
        errorType: "唯一性推理错误",
        correct: false
      };
    }

    if (correctCount >= 3) {
      return {
        id: "property",
        label: "性质与唯一性理解",
        score: 6.8,
        errorType: "论证链条不完整",
        correct: false
      };
    }

    if (correctCount >= 1) {
      return {
        id: "property",
        label: "性质与唯一性理解",
        score: 5.3,
        errorType: "节点性质理解不完整",
        correct: false
      };
    }

    return {
      id: "property",
      label: "性质与唯一性理解",
      score: 0,
      errorType: "未作答",
      correct: false
    };
  })();

  const rungeResult = (() => {
    if (practice.runge === "global-sensitive") {
      return {
        id: "runge",
        label: "误差与节点机制理解",
        score: 8.9,
        errorType: "正确",
        correct: true
      };
    }

    if (!practice.runge) {
      return {
        id: "runge",
        label: "误差与节点机制理解",
        score: 0,
        errorType: "未作答",
        correct: false
      };
    }

    return {
      id: "runge",
      label: "误差与节点机制理解",
      score: 4.7,
      errorType: "误差机制误判",
      correct: false
    };
  })();

  const transferResult = (() => {
    if (practice.transfer === "optimize-or-piecewise") {
      return {
        id: "transfer",
        label: "迁移与方法判断能力",
        score: 9.0,
        errorType: "正确",
        correct: true
      };
    }

    if (!practice.transfer) {
      return {
        id: "transfer",
        label: "迁移与方法判断能力",
        score: 0,
        errorType: "未作答",
        correct: false
      };
    }

    return {
      id: "transfer",
      label: "迁移与方法判断能力",
      score: 4.6,
      errorType: "方法判断偏差",
      correct: false
    };
  })();

  return [basisResult, propertyResult, rungeResult, transferResult];
}

function evaluateExplanation(expression) {
  const reasonText = expression.reason.trim().replace(/\s+/g, "");
  const tipText = expression.tip.trim().replace(/\s+/g, "");

  let reasonScore = 0;
  let tipScore = 0;
  const flags = [];

  if (reasonText.length === 0) {
    flags.push("节点性质解释未填写");
  } else {
    if (reasonText.length >= 8) reasonScore += 2;
    if (hasAny(reasonText, ["Li", "L_i", "基函数", "等于1", "=1", "取1", "对应基函数"])) reasonScore += 2;
    if (
      (hasAny(reasonText, ["其余", "其他", "别的", "剩下"]) && hasAny(reasonText, ["0", "=0"])) ||
      hasAny(reasonText, ["其余基函数都为0", "其他基函数都为0", "其他基函数都为 0", "都为0", "都为 0"])
    ) {
      reasonScore += 3;
    }
    if (hasAny(reasonText, ["所以", "因此", "从而"])) reasonScore += 1;
    if (hasAny(reasonText, ["P_n(x_i)=y_i", "经过节点", "插值条件", "留下来", "只会留下", "恢复函数值", "得到 y_i"])) reasonScore += 2;
  }

  if (tipText.length === 0) {
    flags.push("给同学的提醒未填写");
  } else {
    if (tipText.length >= 8) tipScore += 2;
    if (hasAny(tipText, ["节点", "端点", "误差", "振荡", "龙格", "等距"])) tipScore += 3;
    if (hasAny(tipText, ["分段", "优化", "Chebyshev", "不要只看经过节点", "全局高次"])) tipScore += 2;
    if (hasAny(tipText, ["因为", "所以", "要先"])) tipScore += 1;
  }

  const explanationEvidence = clamp(roundOne(reasonScore * 0.7 + tipScore * 0.3), 0, 10);

  return {
    reasonScore: clamp(reasonScore, 0, 10),
    tipScore: clamp(tipScore, 0, 10),
    explanationEvidence,
    flags,
    isReasonWeak: reasonText.length > 0 && reasonScore <= 3,
    isTipWeak: tipText.length > 0 && tipScore <= 3
  };
}

function buildSubmissionRecord(form, elapsedSeconds, editCount, behavior) {
  const practiceResults = evaluatePractice(form.practice);
  const objectiveAverage = roundOne(
    practiceResults.reduce((sum, item) => sum + item.score, 0) / practiceResults.length
  );
  const explanation = evaluateExplanation(form.expression);
  const confidenceScore =
    confidenceOptions.find((item) => item.value === form.selfReport.confidence)?.score || 0;
  const anxietyScore =
    anxietyOptions.find((item) => item.value === form.selfReport.anxiety)?.score || 0;
  const readinessScore =
    readinessOptions.find((item) => item.value === form.selfReport.readiness)?.score || 0;
  const totalBehaviorClicks = behavior.hintClicks + behavior.verifyClicks + behavior.compareClicks;
  const primaryRole =
    roleExportMap[form.expression.roles[0]] || (form.expression.roles[0] ? form.expression.roles[0] : "待定");

  const textTip = form.expression.tip.trim().replace(/\s+/g, "");
  const rungeTextBonus = hasAny(textTip, ["龙格", "振荡", "端点", "等距", "误差"]) ? 1.2 : 0;
  const transferTextBonus = hasAny(textTip, ["分段", "Chebyshev", "节点优化", "方法"]) ? 1.2 : 0;

  const dimensionScores = {
    construct: clamp(
      roundOne(
        practiceResults[0].score * 0.88 +
          Math.min(behavior.hintClicks, 2) * 0.4 +
          (readinessScore >= 4 ? 0.4 : 0)
      ),
      0,
      10
    ),
    property: clamp(
      roundOne(
        practiceResults[1].score * 0.68 +
          explanation.reasonScore * 0.28 +
          Math.min(behavior.verifyClicks, 2) * 0.9
      ),
      0,
      10
    ),
    runge: clamp(
      roundOne(
        practiceResults[2].score * 0.72 +
          Math.min(behavior.compareClicks, 2) * 1 +
          rungeTextBonus
      ),
      0,
      10
    ),
    transfer: clamp(
      roundOne(
        practiceResults[3].score * 0.78 +
          transferTextBonus +
          (readinessScore >= 4 ? 0.5 : 0)
      ),
      0,
      10
    )
  };

  const checkScoreMap = {
    "我主动点过验证或对比后再检查": 2.4,
    "我简单看过一遍答案": 1.2,
    "我基本没检查就提交了": 0.2
  };

  const calibrationBonusMap = {
    "结果和我预想差不多": 1.2,
    "我高估了自己": 1.6,
    "我低估了自己": 1.4
  };

  const processEvidence = clamp(
    roundOne(
      2 +
        Math.min(editCount, 12) / 4 +
        Math.min(behavior.hintClicks, 2) * 0.8 +
        Math.min(behavior.verifyClicks, 2) * 1 +
        Math.min(behavior.compareClicks, 2) * 1 +
        (checkScoreMap[form.reflection.check] || 0) +
        (calibrationBonusMap[form.reflection.calibration] || 0)
    ),
    0,
    10
  );

  const resultEvidence = objectiveAverage;
  const explanationEvidence = explanation.explanationEvidence;
  const averageDimension = roundOne(
    (dimensionScores.construct +
      dimensionScores.property +
      dimensionScores.runge +
      dimensionScores.transfer) /
      4
  );

  let diagnosis = "基础待补";
  if (confidenceScore >= 4 && resultEvidence < 6 && explanationEvidence < 6) {
    diagnosis = "校准失衡";
  } else if (resultEvidence >= 8 && processEvidence >= 6 && explanationEvidence >= 7) {
    diagnosis = "真懂";
  } else if (resultEvidence >= 7 && (dimensionScores.transfer < 6.5 || explanationEvidence < 6)) {
    diagnosis = "会套";
  } else if (resultEvidence >= 5.5 && processEvidence < 5.5 && explanationEvidence < 5.5) {
    diagnosis = "猜对";
  }

  const weakestDimension = Object.entries(dimensionScores).sort((a, b) => a[1] - b[1])[0];
  const strongestDimension = Object.entries(dimensionScores).sort((a, b) => b[1] - a[1])[0];

  let qualityScore = 100;
  const qualityFlags = [];

  if (elapsedSeconds < 150) {
    qualityScore -= 25;
    qualityFlags.push("总作答时间低于建议阈值");
  }

  if (editCount <= 2) {
    qualityScore -= 10;
    qualityFlags.push("修改痕迹较少");
  }

  if (totalBehaviorClicks === 0) {
    qualityScore -= 10;
    qualityFlags.push("没有显性操作记录");
  }

  if (explanation.flags.length > 0) {
    qualityScore -= 15;
    qualityFlags.push(...explanation.flags);
  }

  if (resultEvidence < 5 && elapsedSeconds < 180) {
    qualityScore -= 20;
    qualityFlags.push("客观题得分偏低且提交偏快");
  }

  if (confidenceScore >= 4 && resultEvidence < 6) {
    qualityScore -= 10;
    qualityFlags.push("自评与客观表现明显不一致");
  }

  if (form.reflection.check === "我基本没检查就提交了") {
    qualityScore -= 8;
    qualityFlags.push("提交前缺少检查行为");
  }

  const finalQualityScore = clamp(qualityScore, 0, 100);

  let qualityBand = "高质量";
  let qualityWeight = 1;
  if (finalQualityScore < 40) {
    qualityBand = "疑似无效";
    qualityWeight = 0;
  } else if (finalQualityScore < 60) {
    qualityBand = "低可信";
    qualityWeight = 0.4;
  } else if (finalQualityScore < 80) {
    qualityBand = "基本可用";
    qualityWeight = 0.7;
  }

  const followUpMap = {
    construct: "回到最小节点例子，补做基函数构造与步骤重建。",
    property: "要求学生完整说出节点处如何恢复函数值，并补上唯一性推理链。",
    runge: "增加节点分布与误差对比，强调“插值成立不等于逼近稳定”。",
    transfer: "补做方法判断题，训练什么时候应考虑节点优化或分段方法。"
  };

  const diagnosisActionMap = {
    "真懂": "可安排解释型任务，让其负责讲清节点性质、误差机制与方法选择。",
    "会套": "结果不差，但解释或迁移还弱，建议加强口头解释和变式判断。",
    "猜对": "需要增加过程验证与解释追问，避免只凭选项或表面特征作答。",
    "校准失衡": "建议先做自评-结果对照，帮助学生校准信心，再回补薄弱维度。",
    "基础待补": "建议从最小例子和节点性质出发，先建立稳定的基本框架。"
  };

  const teacherAction = `${diagnosisActionMap[diagnosis]} 当前最需要补的维度是“${dimensionLabels[weakestDimension[0]]}”，建议：${followUpMap[weakestDimension[0]]}`;

  const submittedAtLabel = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return {
    submittedAtLabel,
    elapsedLabel: formatDuration(elapsedSeconds),
    practiceResults,
    objectiveAverage,
    averageDimension,
    dimensionScores,
    evidenceScores: {
      resultEvidence,
      processEvidence,
      explanationEvidence
    },
    diagnosis,
    quality: {
      score: finalQualityScore,
      band: qualityBand,
      weight: qualityWeight,
      flags: [...new Set(qualityFlags)]
    },
    teacherAction,
    behavior,
    compactSummary: {
      primaryRole,
      strongestDimension,
      weakestDimension
    },
    directData: [
      { label: "学习信心", value: `${form.selfReport.confidence}（${confidenceScore}）` },
      { label: "焦虑感", value: `${form.selfReport.anxiety}（${anxietyScore}）` },
      { label: "新题切入自评", value: form.selfReport.readiness },
      { label: "最需要的支持", value: form.selfReport.support },
      {
        label: "角色偏好",
        value: form.expression.roles.length
          ? form.expression.roles.map((role) => roleLabelMap[role] || role).join("、")
          : "未填写"
      },
      { label: "合作方式", value: form.expression.mode },
      { label: "自我校准", value: form.reflection.calibration }
    ],
    behaviorData: [
      { label: "完成时间", value: formatDuration(elapsedSeconds) },
      { label: "修改次数", value: `${editCount} 次` },
      { label: "构造提示点击", value: `${behavior.hintClicks} 次` },
      { label: "节点验证点击", value: `${behavior.verifyClicks} 次` },
      { label: "误差对比点击", value: `${behavior.compareClicks} 次` },
      { label: "提交前检查", value: form.reflection.check }
    ],
    derivedData: [
      { label: "结果证据分", value: resultEvidence.toFixed(1) },
      { label: "过程证据分", value: processEvidence.toFixed(1) },
      { label: "解释证据分", value: explanationEvidence.toFixed(1) },
      { label: "诊断标签", value: diagnosis },
      { label: "数据质量分", value: `${finalQualityScore} · ${qualityBand}` },
      { label: "数据权重", value: String(qualityWeight) }
    ]
  };
}

function getProgress(form) {
  const sectionProgress = {
    selfReport: [
      form.selfReport.confidence,
      form.selfReport.anxiety,
      form.selfReport.readiness,
      form.selfReport.support
    ].filter(Boolean).length,
    practice: [
      form.practice.basis,
      form.practice.property.length > 0 ? "done" : "",
      form.practice.runge,
      form.practice.transfer
    ].filter(Boolean).length,
    reflection: [
      form.reflection.stuck,
      form.reflection.check,
      form.reflection.calibration
    ].filter(Boolean).length,
    expression: [
      form.expression.roles.length > 0 ? "done" : "",
      form.expression.mode,
      form.expression.reason.trim().length >= 8 ? "done" : "",
      form.expression.tip.trim().length >= 8 ? "done" : ""
    ].filter(Boolean).length
  };

  const completed = Object.values(sectionProgress).reduce((sum, count) => sum + count, 0);
  return {
    sectionProgress,
    completed,
    total: 15,
    ratio: completed / 15
  };
}

function getMissingSections(form) {
  const missing = [];

  if (
    !form.selfReport.confidence ||
    !form.selfReport.anxiety ||
    !form.selfReport.readiness ||
    !form.selfReport.support
  ) {
    missing.push("学习回顾自评");
  }

  if (
    !form.practice.basis ||
    form.practice.property.length === 0 ||
    !form.practice.runge ||
    !form.practice.transfer
  ) {
    missing.push("课后诊断任务");
  }

  if (
    !form.reflection.stuck ||
    !form.reflection.check ||
    !form.reflection.calibration
  ) {
    missing.push("过程反思");
  }

  if (
    form.expression.roles.length === 0 ||
    !form.expression.mode ||
    form.expression.reason.trim().length < 8 ||
    form.expression.tip.trim().length < 8
  ) {
    missing.push("表达与协作");
  }

  return missing;
}

function SurfaceCard({ children, style, className }) {
  return (
    <div className={className} style={{ ...shellCardStyle, ...style }}>
      {children}
    </div>
  );
}

function SectionCard({ index, title, caption, tone, progressText, children }) {
  const palette = TONES[tone];

  return (
    <SurfaceCard style={{ padding: 24, display: "grid", gap: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 32,
                height: 32,
                padding: "0 10px",
                borderRadius: 999,
                background: palette.soft,
                color: palette.solid,
                fontWeight: 700,
                fontSize: 13
              }}
            >
              {index}
            </span>
            <h3 style={{ margin: 0, fontSize: 22, color: "#111827" }}>{title}</h3>
          </div>
          <p style={{ margin: 0, color: "#4b5563", fontSize: 14, lineHeight: 1.7 }}>{caption}</p>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 14,
            border: `1px solid ${palette.border}`,
            background: palette.soft,
            color: palette.text,
            fontSize: 12,
            fontWeight: 600
          }}
        >
          {progressText}
        </div>
      </div>
      {children}
    </SurfaceCard>
  );
}

function QuestionCard({ title, fieldLabel, tone, children, hint, footer }) {
  const palette = TONES[tone];
  const titleNode = typeof title === "string" ? <InlineMathText text={title} /> : title;
  const hintNode = typeof hint === "string" ? <InlineMathText text={hint} /> : hint;
  const footerNode = typeof footer === "string" ? <InlineMathText text={footer} /> : footer;

  return (
    <div style={questionCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={{ color: "#111827", fontSize: 15 }}>{titleNode}</strong>
          {hint ? <span style={{ color: "#6b7280", fontSize: 13 }}>{hintNode}</span> : null}
        </div>
        <span
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: palette.soft,
            color: palette.text,
            border: `1px solid ${palette.border}`,
            fontSize: 11,
            fontWeight: 600
          }}
        >
          生成字段：{fieldLabel}
        </span>
      </div>
      {children}
      {footer ? <div style={{ color: "#6b7280", fontSize: 12 }}>{footerNode}</div> : null}
    </div>
  );
}

function getOptionStyle(active, tone) {
  const palette = TONES[tone];

  return {
    flex: "1 1 220px",
    display: "grid",
    gap: 6,
    minHeight: 84,
    padding: "14px 15px",
    textAlign: "left",
    borderRadius: 16,
    border: active ? `1px solid ${palette.solid}` : "1px solid rgba(31, 31, 26, 0.08)",
    background: active ? palette.soft : "rgba(255,255,255,0.92)",
    color: active ? palette.text : "#374151",
    cursor: "pointer"
  };
}

function ChoiceGroup({ options, value, onChange, tone = "sage" }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((option) => {
        const active = option.value === value;
        const labelText = option.label || option.value;
        return (
          <button
            key={option.value}
            type="button"
            style={getOptionStyle(active, tone)}
            onClick={() => onChange(option.value)}
          >
            <strong style={{ fontSize: 14 }}>
              <InlineMathText text={labelText} />
            </strong>
            <span style={{ fontSize: 12, lineHeight: 1.6, color: active ? "inherit" : "#6b7280" }}>
              <InlineMathText text={option.description} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceGroup({ options, values, onToggle, tone = "sage", limit }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((option) => {
        const active = values.includes(option.value);
        const disabled = !active && limit && values.length >= limit;
        return (
          <button
            key={option.value}
            type="button"
            style={{
              ...getOptionStyle(active, tone),
              opacity: disabled ? 0.48 : 1,
              cursor: disabled ? "not-allowed" : "pointer"
            }}
            onClick={() => {
              if (!disabled) {
                onToggle(option.value);
              }
            }}
          >
            <strong style={{ fontSize: 14 }}>
              <InlineMathText text={option.label} />
            </strong>
            <span style={{ fontSize: 12, lineHeight: 1.6, color: active ? "inherit" : "#6b7280" }}>
              <InlineMathText text={option.description} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }) {
  const labelNode = typeof label === "string" ? <InlineMathText text={label} /> : label;
  const valueNode = typeof value === "string" ? <InlineMathText text={value} /> : value;
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        padding: "12px 14px",
        borderRadius: 16,
        background: "rgba(250, 250, 245, 0.88)",
        border: "1px solid rgba(31,31,26,0.06)"
      }}
    >
      <span style={{ color: "#6b7280", fontSize: 12 }}>{labelNode}</span>
      <strong style={{ color: "#111827", fontSize: 14, lineHeight: 1.6 }}>{valueNode}</strong>
    </div>
  );
}

function ScoreBar({ label, value, tone = "blue", suffix = "/ 10" }) {
  const palette = TONES[tone];
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
        <span style={{ color: "#4b5563" }}>{label}</span>
        <strong style={{ color: "#111827" }}>
          {value.toFixed(1)} {suffix}
        </strong>
      </div>
      <div
        style={{
          height: 9,
          borderRadius: 999,
          background: "rgba(31,31,26,0.08)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${clamp(value * 10, 0, 100)}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${palette.solid} 0%, #111827 100%)`
          }}
        />
      </div>
    </div>
  );
}

function ActionButton({ label, tone, onClick }) {
  const palette = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        border: `1px solid ${palette.border}`,
        background: palette.soft,
        color: palette.text,
        fontWeight: 700,
        cursor: "pointer",
        width: "fit-content"
      }}
    >
      {label}
    </button>
  );
}

function ToolNote({ tone, children }) {
  const palette = TONES[tone];
  const content = typeof children === "string" ? <InlineMathText text={children} /> : children;
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: `1px solid ${palette.border}`,
        background: palette.soft,
        color: palette.text,
        fontSize: 13,
        lineHeight: 1.7
      }}
    >
      {content}
    </div>
  );
}

export function LagrangeFeedbackPage({ onOpenLagrange }) {
  const [form, setForm] = useState(() => createEmptyForm());
  const [editCount, setEditCount] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [isSubmittedDirty, setIsSubmittedDirty] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [behavior, setBehavior] = useState({
    hintClicks: 0,
    verifyClicks: 0,
    compareClicks: 0
  });
  const [toolsOpen, setToolsOpen] = useState({
    hint: false,
    verify: false,
    compare: false
  });
  const startedAtRef = useRef(Date.now());
  const resultRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!submittedRecord || !resultRef.current) {
      return;
    }

    resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [submittedRecord]);

  const progress = useMemo(() => getProgress(form), [form]);
  const elapsedSeconds = Math.max(1, Math.floor((now - startedAtRef.current) / 1000));

  function markEdited() {
    setEditCount((current) => current + 1);
    setSubmitError("");
    if (submittedRecord) {
      setIsSubmittedDirty(true);
    }
  }

  function updateSelfReport(key, value) {
    setForm((current) => ({
      ...current,
      selfReport: {
        ...current.selfReport,
        [key]: value
      }
    }));
    markEdited();
  }

  function updatePractice(key, value) {
    setForm((current) => ({
      ...current,
      practice: {
        ...current.practice,
        [key]: value
      }
    }));
    markEdited();
  }

  function togglePracticeOption(value) {
    setForm((current) => {
      const nextValues = current.practice.property.includes(value)
        ? current.practice.property.filter((item) => item !== value)
        : [...current.practice.property, value];

      return {
        ...current,
        practice: {
          ...current.practice,
          property: nextValues
        }
      };
    });
    markEdited();
  }

  function updateReflection(key, value) {
    setForm((current) => ({
      ...current,
      reflection: {
        ...current.reflection,
        [key]: value
      }
    }));
    markEdited();
  }

  function toggleRole(value) {
    setForm((current) => {
      const alreadySelected = current.expression.roles.includes(value);
      const nextRoles = alreadySelected
        ? current.expression.roles.filter((role) => role !== value)
        : current.expression.roles.length >= 2
          ? current.expression.roles
          : [...current.expression.roles, value];

      return {
        ...current,
        expression: {
          ...current.expression,
          roles: nextRoles
        }
      };
    });
    markEdited();
  }

  function updateExpression(key, value) {
    setForm((current) => ({
      ...current,
      expression: {
        ...current.expression,
        [key]: value
      }
    }));
    markEdited();
  }

  function resetTiming() {
    startedAtRef.current = Date.now();
    setNow(Date.now());
  }

  function loadDemoForm() {
    setForm(createDemoForm());
    setBehavior({ hintClicks: 1, verifyClicks: 1, compareClicks: 1 });
    setToolsOpen({ hint: true, verify: true, compare: true });
    setEditCount(0);
    setSubmitError("");
    setSubmittedRecord(null);
    setIsSubmittedDirty(false);
    resetTiming();
  }

  function clearForm() {
    setForm(createEmptyForm());
    setBehavior({ hintClicks: 0, verifyClicks: 0, compareClicks: 0 });
    setToolsOpen({ hint: false, verify: false, compare: false });
    setEditCount(0);
    setSubmitError("");
    setSubmittedRecord(null);
    setIsSubmittedDirty(false);
    resetTiming();
  }

  function activateTool(toolKey) {
    setBehavior((current) => ({
      ...current,
      [toolKey]: current[toolKey] + 1
    }));
    setToolsOpen((current) => ({
      ...current,
      [toolKey === "hintClicks" ? "hint" : toolKey === "verifyClicks" ? "verify" : "compare"]: true
    }));
    markEdited();
  }

  function handleSubmit(event) {
    event.preventDefault();

    const missingSections = getMissingSections(form);
    if (missingSections.length > 0) {
      setSubmitError(`还需要完成：${missingSections.join("、")}。`);
      return;
    }

    const record = buildSubmissionRecord(form, elapsedSeconds, editCount, behavior);
    setSubmittedRecord(record);
    setIsSubmittedDirty(false);
    setSubmitError("");
  }

  return (
    <div className="tool-workspace">
      <div className="tool-workspace-shell">
        <SurfaceCard className="tool-surface-panel tool-page-hero">
          <div className="tool-page-hero-head">
            <div className="tool-page-hero-copy">
              <span
                className="tool-page-kicker"
                style={{
                  background: TONES.rose.soft,
                  color: TONES.rose.text,
                  border: `1px solid ${TONES.rose.border}`
                }}
              >
                拉格朗日插值 · 课后反馈数据收集与统计
              </span>

              <div style={{ display: "grid", gap: 8 }}>
                <h2 className="tool-page-title">课后反馈与诊断页</h2>
                <p className="tool-page-summary">请完成以下课后反馈与诊断任务。</p>
              </div>
            </div>

            <div className="tool-page-actions">
              <button
                type="button"
                onClick={loadDemoForm}
                style={{
                  padding: "12px 16px",
                  borderRadius: 16,
                  border: `1px solid ${TONES.blue.border}`,
                  background: TONES.blue.soft,
                  color: TONES.blue.text,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                载入演示样例
              </button>
              <button
                type="button"
                onClick={clearForm}
                style={{
                  padding: "12px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(31,31,26,0.08)",
                  background: "rgba(255,255,255,0.9)",
                  color: "#374151",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                清空重填
              </button>
            </div>
          </div>

          <div className="tool-page-stat-row">
            {[
              { label: "对象", value: "拉格朗日插值课后反馈" },
              { label: "证据来源", value: "结果 / 过程 / 解释" },
              { label: "核心维度", value: "4 项" },
              { label: "质量检查", value: "时间 / 操作 / 一致性 / 开放题" }
            ].map((item) => (
              <div key={item.label} className="tool-page-stat-chip">
                <span style={{ color: "#6b7280", fontSize: 13 }}>{item.label}</span>
                <strong style={{ color: "#111827", fontSize: 13 }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="tool-page-grid">
          <form onSubmit={handleSubmit} className="tool-page-main">
            {submitError ? (
              <SurfaceCard
                style={{
                  padding: "16px 18px",
                  borderColor: "rgba(220, 38, 38, 0.16)",
                  background: "linear-gradient(180deg, rgba(255,248,248,0.96) 0%, rgba(255,252,252,0.92) 100%)"
                }}
              >
                <strong style={{ color: "#b42318", fontSize: 14 }}>{submitError}</strong>
              </SurfaceCard>
            ) : null}

            <SectionCard
              index="01"
              title="学习回顾自评"
              caption="这一部分保留学生主动填写的数据，用来反映学习信心、焦虑感、切入能力判断和支架需求。"
              tone="sage"
              progressText={`${progress.sectionProgress.selfReport} / 4 已完成`}
            >
              <QuestionCard title="现在回顾本节内容，你对拉格朗日插值的掌握信心如何？" fieldLabel="学习信心" tone="sage">
                <ChoiceGroup
                  options={confidenceOptions}
                  value={form.selfReport.confidence}
                  onChange={(value) => updateSelfReport("confidence", value)}
                  tone="sage"
                />
              </QuestionCard>

              <QuestionCard title="完成课后反馈时，你的状态更接近：" fieldLabel="焦虑感" tone="sage">
                <ChoiceGroup
                  options={anxietyOptions}
                  value={form.selfReport.anxiety}
                  onChange={(value) => updateSelfReport("anxiety", value)}
                  tone="sage"
                />
              </QuestionCard>

              <QuestionCard title="面对一个新的拉格朗日插值题时，你通常更接近哪种情况？" fieldLabel="新题切入自评" tone="sage">
                <ChoiceGroup
                  options={readinessOptions}
                  value={form.selfReport.readiness}
                  onChange={(value) => updateSelfReport("readiness", value)}
                  tone="sage"
                />
              </QuestionCard>

              <QuestionCard title="如果再补一个支持，你最希望是哪一种？" fieldLabel="支架需求" tone="sage">
                <ChoiceGroup
                  options={supportOptions}
                  value={form.selfReport.support}
                  onChange={(value) => updateSelfReport("support", value)}
                  tone="sage"
                />
              </QuestionCard>
            </SectionCard>

            <SectionCard
              index="02"
              title="课后诊断任务"
              caption="这四题分别对应构造能力、性质与唯一性理解、误差与节点机制理解、迁移与方法判断能力。系统会记录答案、点击操作和完成时间。"
              tone="blue"
              progressText={`${progress.sectionProgress.practice} / 4 已完成`}
            >
              <QuestionCard
                title={practiceQuestions[0].title}
                hint={practiceQuestions[0].prompt}
                fieldLabel="构造能力得分 / 错误类型"
                tone="blue"
                footer="查看提示会被记录为过程证据，用于判断你是如何完成构造任务的。"
              >
                <ChoiceGroup
                  options={practiceQuestions[0].options}
                  value={form.practice.basis}
                  onChange={(value) => updatePractice("basis", value)}
                  tone="blue"
                />
                <ActionButton
                  label={`查看基函数构造提示（已点 ${behavior.hintClicks} 次）`}
                  tone="blue"
                  onClick={() => activateTool("hintClicks")}
                />
                {toolsOpen.hint ? (
                  <ToolNote tone="blue">
                    <InlineMathText text="构造 \\(L_1(x)\\) 时，要让它在 \\(x_1\\) 处取 1，同时在 \\(x_0,x_2\\) 处都为 0，所以分子必须包含 \\((x-x_0)(x-x_2)\\)。" />
                  </ToolNote>
                ) : null}
              </QuestionCard>

              <QuestionCard
                title={practiceQuestions[1].title}
                hint={practiceQuestions[1].prompt}
                fieldLabel="性质与唯一性理解得分 / 错误类型"
                tone="blue"
                footer="如果你主动点验证，系统会把这类行为记为过程证据，而不是只看最后是否选对。"
              >
                <MultiChoiceGroup
                  options={practiceQuestions[1].options}
                  values={form.practice.property}
                  onToggle={togglePracticeOption}
                  tone="blue"
                />
                <ActionButton
                  label={`验证节点性质（已点 ${behavior.verifyClicks} 次）`}
                  tone="blue"
                  onClick={() => activateTool("verifyClicks")}
                />
                {toolsOpen.verify ? (
                  <ToolNote tone="blue">
                    <InlineMathText text="验证思路：先用 \\(L_i(x_i)=1\\) 和 \\(L_k(x_i)=0\\,(k\\neq i)\\) 推出 \\(P_n(x_i)=y_i\\)，再看若有另一多项式同样满足这些节点值，则两者之差在 \\(n+1\\) 个互异节点处为 0，只能恒为 0。" />
                  </ToolNote>
                ) : null}
              </QuestionCard>

              <QuestionCard
                title={practiceQuestions[2].title}
                hint={practiceQuestions[2].prompt}
                fieldLabel="误差与节点机制理解得分 / 错误类型"
                tone="blue"
              >
                <ChoiceGroup
                  options={practiceQuestions[2].options}
                  value={form.practice.runge}
                  onChange={(value) => updatePractice("runge", value)}
                  tone="blue"
                />
                <ActionButton
                  label={`查看误差对比提醒（已点 ${behavior.compareClicks} 次）`}
                  tone="blue"
                  onClick={() => activateTool("compareClicks")}
                />
                {toolsOpen.compare ? (
                  <ToolNote tone="blue">
                    <InlineMathText text="关键提醒：插值条件仍然成立，问题出在全局高次多项式对节点分布敏感。等距节点在端点附近更容易放大误差，这就是要警惕龙格现象的原因。" />
                  </ToolNote>
                ) : null}
              </QuestionCard>

              <QuestionCard
                title={practiceQuestions[3].title}
                hint={practiceQuestions[3].prompt}
                fieldLabel="迁移与方法判断能力得分 / 错误类型"
                tone="blue"
              >
                <ChoiceGroup
                  options={practiceQuestions[3].options}
                  value={form.practice.transfer}
                  onChange={(value) => updatePractice("transfer", value)}
                  tone="blue"
                />
              </QuestionCard>
            </SectionCard>

            <SectionCard
              index="03"
              title="过程反思"
              caption="这一部分记录学生如何判断自己的卡点、是否主动验证，以及对自身掌握程度的校准。"
              tone="amber"
              progressText={`${progress.sectionProgress.reflection} / 3 已完成`}
            >
              <QuestionCard title="做完这组题后，你主要卡在哪一类问题？" fieldLabel="困难位置" tone="amber">
                <ChoiceGroup
                  options={reflectionOptions.stuck}
                  value={form.reflection.stuck}
                  onChange={(value) => updateReflection("stuck", value)}
                  tone="amber"
                />
              </QuestionCard>

              <QuestionCard title="提交前，你的检查方式更接近：" fieldLabel="检查行为" tone="amber">
                <ChoiceGroup
                  options={reflectionOptions.check}
                  value={form.reflection.check}
                  onChange={(value) => updateReflection("check", value)}
                  tone="amber"
                />
              </QuestionCard>

              <QuestionCard title="对比做题前的感觉，你现在更接近：" fieldLabel="自我校准" tone="amber">
                <ChoiceGroup
                  options={reflectionOptions.calibration}
                  value={form.reflection.calibration}
                  onChange={(value) => updateReflection("calibration", value)}
                  tone="amber"
                />
              </QuestionCard>
            </SectionCard>

            <SectionCard
              index="04"
              title="表达与协作"
              caption="这部分专门收集解释证据和合作倾向，避免“会做但不会讲”被误判成真正理解。"
              tone="rose"
              progressText={`${progress.sectionProgress.expression} / 4 已完成`}
            >
              <QuestionCard
                title="在课后讨论里，你更愿意承担哪些任务？"
                hint="最多选 2 项"
                fieldLabel="角色偏好 / 主要角色标签"
                tone="rose"
              >
                <MultiChoiceGroup
                  options={roleChoiceOptions}
                  values={form.expression.roles}
                  onToggle={toggleRole}
                  tone="rose"
                  limit={2}
                />
              </QuestionCard>

              <QuestionCard
                title="如果和同伴一起复盘这节内容，你更愿意："
                fieldLabel="合作方式"
                tone="rose"
              >
                <ChoiceGroup
                  options={collaborationModeOptions}
                  value={form.expression.mode}
                  onChange={(value) => updateExpression("mode", value)}
                  tone="rose"
                />
              </QuestionCard>

              <QuestionCard
                title="请用一句话说明：为什么 \\(P_n(x_i)=y_i\\)？"
                fieldLabel="解释证据 / 性质理解得分"
                tone="rose"
                footer="不少于 8 个字；系统会根据因果链条和关键对象判断解释层级。"
              >
                <textarea
                  value={form.expression.reason}
                  onChange={(event) => updateExpression("reason", event.target.value)}
                  placeholder="例如：在第 i 个节点处，只有对应基函数取 1，其他基函数都为 0，所以最后只会留下 y_i 那一项。"
                  rows={4}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: "1px solid rgba(31,31,26,0.1)",
                    background: "rgba(255,255,255,0.94)",
                    color: "#111827",
                    lineHeight: 1.7
                  }}
                />
              </QuestionCard>

              <QuestionCard
                title="如果同学只会说“它经过节点，所以一定逼近得很好”，你最想提醒他什么？"
                fieldLabel="解释证据 / 误差与迁移判断"
                tone="rose"
                footer="这里最适合体现你是否理解“插值成立”和“逼近稳定”不是一回事。"
              >
                <textarea
                  value={form.expression.tip}
                  onChange={(event) => updateExpression("tip", event.target.value)}
                  placeholder="例如：经过节点只说明插值条件成立，但等距节点很多时端点仍可能振荡，所以还要看节点分布和误差。"
                  rows={4}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: "1px solid rgba(31,31,26,0.1)",
                    background: "rgba(255,255,255,0.94)",
                    color: "#111827",
                    lineHeight: 1.7
                  }}
                />
              </QuestionCard>
            </SectionCard>

            <SurfaceCard style={{ padding: 24, display: "grid", gap: 14 }}>
              <h3 style={{ margin: 0, fontSize: 20, color: "#111827" }}>本页如何记录学习数据</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <InfoRow
                  label="学生主动填写"
                  value="学习信心、焦虑感、新题切入判断、支架需求、合作偏好和简短解释。"
                />
                <InfoRow
                  label="系统自动记录"
                  value="四道诊断题的作答结果、提示/验证/对比按钮点击、修改次数和总完成时间。"
                />
                <InfoRow
                  label="教师后续整理"
                  value="四个维度得分、结果证据/过程证据/解释证据、诊断标签、数据质量分和反馈建议。"
                />
              </div>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13, lineHeight: 1.8 }}>
                为更准确了解学习过程，系统会透明记录题目作答时间、答案提交情况和部分操作行为数据。
                这些记录仅用于课后反馈统计、学习诊断和后续教学改进。
              </p>
            </SurfaceCard>

            <SurfaceCard style={{ padding: 24, display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <strong style={{ fontSize: 18, color: "#111827" }}>提交并生成统计</strong>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>
                    提交后会生成维度得分、三类证据、诊断标签、质量分和教师反馈动作。
                  </span>
                </div>

                <button
                  type="submit"
                  style={{
                    padding: "14px 20px",
                    borderRadius: 16,
                    border: "none",
                    background: "#111827",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 18px 34px -22px rgba(17, 24, 39, 0.58)"
                  }}
                >
                  提交并生成统计结果
                </button>
              </div>
            </SurfaceCard>

            {submittedRecord ? (
              <div ref={resultRef}>
                <SurfaceCard style={{ padding: 24, display: "grid", gap: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 22, color: "#111827" }}>课后反馈统计结果</h3>
                      <p style={{ margin: 0, color: "#4b5563", fontSize: 14, lineHeight: 1.8 }}>
                        下面这组结果对应教师在课后看到的统计口径：四个维度、三类证据、诊断标签、质量分和下一步教学动作。
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 16,
                        border: `1px solid ${TONES.rose.border}`,
                        background: TONES.rose.soft,
                        color: TONES.rose.text,
                        fontSize: 13,
                        fontWeight: 700
                      }}
                    >
                      已提交 · {submittedRecord.submittedAtLabel}
                    </div>
                  </div>

                  {isSubmittedDirty ? (
                    <ToolNote tone="amber">
                      你在提交后又改了内容。当前结果还是上一次提交时生成的统计，重新提交后会刷新。
                    </ToolNote>
                  ) : null}

                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {[
                      { label: "诊断标签", value: submittedRecord.diagnosis, tone: "rose" },
                      {
                        label: "数据质量",
                        value: `${submittedRecord.quality.score} · ${submittedRecord.quality.band}`,
                        tone: "amber"
                      },
                      { label: "完成时间", value: submittedRecord.elapsedLabel, tone: "blue" },
                      { label: "平均维度分", value: submittedRecord.averageDimension.toFixed(1), tone: "sage" }
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          flex: "1 1 180px",
                          padding: "14px 16px",
                          borderRadius: 18,
                          border: `1px solid ${TONES[item.tone].border}`,
                          background: TONES[item.tone].soft
                        }}
                      >
                        <div style={{ color: TONES[item.tone].text, fontSize: 12 }}>{item.label}</div>
                        <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "#111827" }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <strong style={{ color: "#111827", fontSize: 18 }}>四个核心维度</strong>
                    <ScoreBar label="构造能力" value={submittedRecord.dimensionScores.construct} tone="blue" />
                    <ScoreBar label="性质与唯一性理解" value={submittedRecord.dimensionScores.property} tone="blue" />
                    <ScoreBar label="误差与节点机制理解" value={submittedRecord.dimensionScores.runge} tone="blue" />
                    <ScoreBar label="迁移与方法判断能力" value={submittedRecord.dimensionScores.transfer} tone="blue" />
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    <strong style={{ color: "#111827", fontSize: 18 }}>三类证据</strong>
                    <ScoreBar label="结果证据" value={submittedRecord.evidenceScores.resultEvidence} tone="sage" />
                    <ScoreBar label="过程证据" value={submittedRecord.evidenceScores.processEvidence} tone="amber" />
                    <ScoreBar label="解释证据" value={submittedRecord.evidenceScores.explanationEvidence} tone="rose" />
                  </div>

                  <ToolNote tone="slate">
                    <strong style={{ display: "block", marginBottom: 6, color: "#111827" }}>教师反馈动作</strong>
                    {submittedRecord.teacherAction}
                  </ToolNote>

                  {submittedRecord.quality.flags.length > 0 ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <strong style={{ color: "#111827", fontSize: 18 }}>数据质量检查结果</strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {submittedRecord.quality.flags.map((flag) => (
                          <span
                            key={flag}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 999,
                              background: "rgba(245, 158, 11, 0.12)",
                              border: "1px solid rgba(245, 158, 11, 0.24)",
                              color: "#8a5a04",
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="tool-page-data-grid">
                    <div className="tool-page-data-column">
                      <strong style={{ color: "#111827" }}>直接填写数据</strong>
                      {submittedRecord.directData.map((item) => (
                        <InfoRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>

                    <div className="tool-page-data-column">
                      <strong style={{ color: "#111827" }}>系统记录数据</strong>
                      {[...submittedRecord.behaviorData, ...submittedRecord.practiceResults.map((item) => ({
                        label: item.label,
                        value: `${item.score.toFixed(1)} 分 · ${item.errorType}`
                      }))].map((item) => (
                        <InfoRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>

                    <div className="tool-page-data-column">
                      <strong style={{ color: "#111827" }}>教师整理指标</strong>
                      {submittedRecord.derivedData.map((item) => (
                        <InfoRow key={item.label} label={item.label} value={item.value} />
                      ))}
                      <InfoRow
                        label="当前最强维度"
                        value={dimensionLabels[submittedRecord.compactSummary.strongestDimension[0]]}
                      />
                      <InfoRow
                        label="当前最弱维度"
                        value={dimensionLabels[submittedRecord.compactSummary.weakestDimension[0]]}
                      />
                    </div>
                  </div>

                  <SurfaceCard style={{ padding: 18, display: "grid", gap: 10 }}>
                    <strong style={{ color: "#111827", fontSize: 18 }}>进入班级统计后可汇总的口径</strong>
                    <div className="tool-note-list">
                      {[
                        "四个核心维度的班级均值与薄弱维度分布。",
                        "“真懂 / 会套 / 猜对 / 校准失衡 / 基础待补”的标签占比。",
                        "结果证据、过程证据、解释证据之间的失衡情况。",
                        "高质量 / 低可信 / 疑似无效数据的比例与权重。"
                      ].map((item) => (
                        <div key={item} className="tool-note-card">
                          {item}
                        </div>
                      ))}
                    </div>
                  </SurfaceCard>

                  {onOpenLagrange ? (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={onOpenLagrange}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 16,
                          border: `1px solid ${TONES.blue.border}`,
                          background: TONES.blue.soft,
                          color: TONES.blue.text,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        返回拉格朗日插值内容页
                      </button>
                    </div>
                  ) : null}
                </SurfaceCard>
              </div>
            ) : null}
          </form>

          <div className="tool-page-rail">
            <div className="tool-page-rail-sticky">
              <SurfaceCard style={{ padding: 22, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <strong style={{ color: "#111827", fontSize: 18 }}>当前作答进度</strong>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>
                    {progress.completed} / {progress.total} 项已完成
                  </span>
                </div>

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(31,31,26,0.08)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(progress.ratio * 100)}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #d0337f 0%, #2b6adf 100%)"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { label: "学习回顾自评", value: `${progress.sectionProgress.selfReport} / 4` },
                    { label: "课后诊断任务", value: `${progress.sectionProgress.practice} / 4` },
                    { label: "过程反思", value: `${progress.sectionProgress.reflection} / 3` },
                    { label: "表达与协作", value: `${progress.sectionProgress.expression} / 4` },
                    { label: "当前用时", value: formatDuration(elapsedSeconds) }
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px dashed rgba(31,31,26,0.08)",
                        fontSize: 13
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>{item.label}</span>
                      <strong style={{ color: "#111827" }}>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard style={{ padding: 22, display: "grid", gap: 12 }}>
                <strong style={{ color: "#111827", fontSize: 18 }}>显性采集与隐性记录</strong>
                <InfoRow label="显性采集" value="自评、选项作答、简短解释、反思内容、合作偏好。" />
                <InfoRow label="隐性记录" value="开始时间、提交时间、总时长、修改次数、提示/验证/对比按钮点击次数。" />
                <InfoRow label="清洗依据" value="时间阈值、开放题有效性、操作痕迹、自评与表现一致性。" />
              </SurfaceCard>

              <SurfaceCard style={{ padding: 22, display: "grid", gap: 12 }}>
                <strong style={{ color: "#111827", fontSize: 18 }}>过程证据实时记录</strong>
                <InfoRow label="基函数提示点击" value={`${behavior.hintClicks} 次`} />
                <InfoRow label="节点验证点击" value={`${behavior.verifyClicks} 次`} />
                <InfoRow label="误差对比点击" value={`${behavior.compareClicks} 次`} />
                <InfoRow label="修改次数" value={`${editCount} 次`} />
              </SurfaceCard>

              <SurfaceCard style={{ padding: 22, display: "grid", gap: 12 }}>
                <strong style={{ color: "#111827", fontSize: 18 }}>诊断框架</strong>
                <div className="tool-note-list">
                  {[
                    "真懂：结果证据高，且过程证据、解释证据也稳定。",
                    "会套：结果不差，但解释链条或迁移判断偏弱。",
                    "猜对：选项可能做对，但过程与解释证据都不足。",
                    "校准失衡：学生自评明显高于实际表现。",
                    "基础待补：四个维度整体还不稳定。"
                  ].map((item) => (
                    <div key={item} className="tool-note-card">
                      {item}
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard style={{ padding: 22, display: "grid", gap: 10 }}>
                <strong style={{ color: "#111827", fontSize: 18 }}>快捷操作</strong>
                <button
                  type="button"
                  onClick={loadDemoForm}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: `1px solid ${TONES.rose.border}`,
                    background: TONES.rose.soft,
                    color: TONES.rose.text,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  一键填入演示样例
                </button>
                <button
                  type="button"
                  onClick={clearForm}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: "1px solid rgba(31,31,26,0.08)",
                    background: "rgba(255,255,255,0.92)",
                    color: "#374151",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  还原为空白课后页
                </button>
                {onOpenLagrange ? (
                  <button
                    type="button"
                    onClick={onOpenLagrange}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: `1px solid ${TONES.blue.border}`,
                      background: TONES.blue.soft,
                      color: TONES.blue.text,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    打开拉格朗日内容页
                  </button>
                ) : null}
              </SurfaceCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
