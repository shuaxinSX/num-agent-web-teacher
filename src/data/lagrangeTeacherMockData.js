export const dimensionLabels = {
  construct: "构造能力",
  property: "性质与唯一性理解",
  runge: "误差与节点机制理解",
  transfer: "迁移与方法判断能力"
};

export const diagnosisMeta = {
  真懂: {
    color: "#54d8ff",
    glow: "rgba(84, 216, 255, 0.24)",
    description: "结果、过程、解释三类证据都稳定，可进入提升题或承担讲解任务。",
    action: "可安排解释型任务，带动同伴讲清节点性质、误差机制与方法选择。"
  },
  会套: {
    color: "#8b78ff",
    glow: "rgba(139, 120, 255, 0.24)",
    description: "结果不差，但解释链条或迁移判断偏弱，容易停留在套公式层面。",
    action: "优先追问“为什么”，并补做变式判断，防止只会套模板。"
  },
  猜对: {
    color: "#f4c968",
    glow: "rgba(244, 201, 104, 0.24)",
    description: "答案可能做对，但过程痕迹和解释证据不足，结果稳定性偏弱。",
    action: "增加过程验证与解释追问，不直接把这类结果等同于真正掌握。"
  },
  校准失衡: {
    color: "#ff9358",
    glow: "rgba(255, 147, 88, 0.24)",
    description: "自评显著高于实际表现，说明元认知校准需要优先干预。",
    action: "先做自评-结果对照，再回补薄弱维度，避免继续高估。"
  },
  基础待补: {
    color: "#ff5d7a",
    glow: "rgba(255, 93, 122, 0.24)",
    description: "四个维度整体还不稳定，需要回到节点、基函数与唯一性的基础链条。",
    action: "从最小例子和节点性质重新搭脚手架，先稳住基础框架。"
  }
};

export const qualityMeta = {
  高质量: {
    color: "#65e1c7",
    glow: "rgba(101, 225, 199, 0.22)"
  },
  基本可用: {
    color: "#7fb7ff",
    glow: "rgba(127, 183, 255, 0.22)"
  },
  低可信: {
    color: "#ffc36c",
    glow: "rgba(255, 195, 108, 0.22)"
  },
  疑似无效: {
    color: "#ff7b8f",
    glow: "rgba(255, 123, 143, 0.22)"
  }
};

const confidenceOptions = [
  { value: "很有把握", score: 5 },
  { value: "比较有把握", score: 4 },
  { value: "一般", score: 3 },
  { value: "不太有把握", score: 2 },
  { value: "几乎没把握", score: 1 }
];

const anxietyOptions = [
  { value: "很轻松", score: 1 },
  { value: "略有压力", score: 2 },
  { value: "有点紧张", score: 3 },
  { value: "比较紧张", score: 4 },
  { value: "很紧张", score: 5 }
];

const readinessOptions = [
  {
    value: "我能先判断该从哪个基函数或哪个性质切入",
    score: 5
  },
  {
    value: "我大致知道方向，但解释链条常常不完整",
    score: 4
  },
  {
    value: "我通常先套公式，再看结果是否合理",
    score: 3
  },
  {
    value: "我常常不知道该先看节点、误差还是方法",
    score: 2
  }
];

const roleOptionMap = {
  讲解思路: { value: "讲解", exportValue: "讲解" },
  构造公式: { value: "构造", exportValue: "构造" },
  "检查节点与图像": { value: "验证", exportValue: "验证" },
  整理比较结论: { value: "整理", exportValue: "组织" },
  组织同伴讨论: { value: "组织", exportValue: "组织" }
};

const roleLabelMap = Object.fromEntries(
  Object.entries(roleOptionMap).map(([label, config]) => [config.value, label])
);

const roleExportMap = Object.fromEntries(
  Object.values(roleOptionMap).map((config) => [config.value, config.exportValue])
);

const followUpMap = {
  construct: "回到最小节点例子，补做基函数构造与步骤重建。",
  property: "要求学生完整说出节点处如何恢复函数值，并补上唯一性推理链。",
  runge: "增加节点分布与误差对比，强调“插值成立不等于逼近稳定”。",
  transfer: "补做方法判断题，训练什么时候应考虑节点优化或分段方法。"
};

const diagnosisActionMap = {
  真懂: "可安排解释型任务，让其负责讲清节点性质、误差机制与方法选择。",
  会套: "结果不差，但解释或迁移还弱，建议加强口头解释和变式判断。",
  猜对: "需要增加过程验证与解释追问，避免只凭选项或表面特征作答。",
  校准失衡: "建议先做自评-结果对照，帮助学生校准信心，再回补薄弱维度。",
  基础待补: "建议从最小例子和节点性质出发，先建立稳定的基本框架。"
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

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
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
    if (hasAny(reasonText, ["P_n(x_i)=y_i", "经过节点", "插值条件", "留下来", "只会留下", "恢复函数值", "得到y_i"])) {
      reasonScore += 2;
    }
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
    flags
  };
}

function buildSubmissionRecord(form, elapsedSeconds, editCount, behavior, submittedAt) {
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

  const teacherAction = `${diagnosisActionMap[diagnosis]} 当前最需要补的维度是“${dimensionLabels[weakestDimension[0]]}”，建议：${followUpMap[weakestDimension[0]]}`;
  const confidenceIndex = roundOne(((confidenceScore + readinessScore) / 2) * 2);

  return {
    submittedAtLabel: formatTime(submittedAt),
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
    ],
    rawForm: form,
    meta: {
      confidenceScore,
      anxietyScore,
      readinessScore,
      confidenceIndex,
      confidenceGap: roundOne(confidenceIndex - averageDimension),
      supportNeed: form.selfReport.support,
      collaborationMode: form.expression.mode,
      roles: form.expression.roles,
      calibration: form.reflection.calibration,
      stuckPoint: form.reflection.stuck,
      primaryRole,
      textResponses: {
        reason: form.expression.reason.trim(),
        tip: form.expression.tip.trim()
      }
    },
    submittedAt
  };
}

function createForm(data) {
  return {
    selfReport: {
      confidence: data.selfReport.confidence,
      anxiety: data.selfReport.anxiety,
      readiness: data.selfReport.readiness,
      support: data.selfReport.support
    },
    practice: {
      basis: data.practice.basis,
      property: [...data.practice.property],
      runge: data.practice.runge,
      transfer: data.practice.transfer
    },
    reflection: {
      stuck: data.reflection.stuck,
      check: data.reflection.check,
      calibration: data.reflection.calibration
    },
    expression: {
      roles: [...data.expression.roles],
      mode: data.expression.mode,
      reason: data.expression.reason,
      tip: data.expression.tip
    }
  };
}

const PROFILE_BUILDERS = {
  masteryExplainer(index) {
    return {
      form: createForm({
        selfReport: {
          confidence: index % 3 === 0 ? "很有把握" : "比较有把握",
          anxiety: index % 2 === 0 ? "略有压力" : "很轻松",
          readiness: "我能先判断该从哪个基函数或哪个性质切入",
          support: "节点与误差对比图"
        },
        practice: {
          basis: "correct",
          property: ["self-one", "others-zero", "interpolation", "uniqueness"],
          runge: "global-sensitive",
          transfer: "optimize-or-piecewise"
        },
        reflection: {
          stuck: "基本没有明显困难",
          check: "我主动点过验证或对比后再检查",
          calibration: index % 2 === 0 ? "结果和我预想差不多" : "我低估了自己"
        },
        expression: {
          roles: index % 2 === 0 ? ["讲解", "组织"] : ["讲解", "验证"],
          mode: "先自己解释，再交流",
          reason: "在第 i 个节点处，对应基函数取 1，其他基函数都为 0，所以求和后只剩下 y_i 那一项，插值条件自然成立。",
          tip: "经过节点只说明插值条件成立，等距节点多时端点误差会被放大，要结合节点分布判断，必要时改用分段方法。"
        }
      }),
      elapsedSeconds: 650 + index * 13,
      editCount: 7 + (index % 3),
      behavior: {
        hintClicks: 1,
        verifyClicks: 2,
        compareClicks: 1
      }
    };
  },

  masteryQuiet(index) {
    return {
      form: createForm({
        selfReport: {
          confidence: index % 2 === 0 ? "一般" : "不太有把握",
          anxiety: "有点紧张",
          readiness: "我大致知道方向，但解释链条常常不完整",
          support: "一步一步的构造提示"
        },
        practice: {
          basis: "correct",
          property: ["self-one", "others-zero", "interpolation", "uniqueness"],
          runge: "global-sensitive",
          transfer: "optimize-or-piecewise"
        },
        reflection: {
          stuck: "基本没有明显困难",
          check: "我主动点过验证或对比后再检查",
          calibration: "我低估了自己"
        },
        expression: {
          roles: ["验证", "整理"],
          mode: "先听别人讲，再自己整理",
          reason: "因为在 x_i 处只有对应基函数保留下来，其他基函数都变成 0，所以最后恢复的就是 y_i。",
          tip: "不要把经过节点和逼近稳定混为一谈，端点附近还要看节点分布和误差是否被放大。"
        }
      }),
      elapsedSeconds: 720 + index * 9,
      editCount: 6 + (index % 2),
      behavior: {
        hintClicks: 1,
        verifyClicks: 2,
        compareClicks: 2
      }
    };
  },

  routineTemplate(index) {
    return {
      form: createForm({
        selfReport: {
          confidence: "比较有把握",
          anxiety: index % 2 === 0 ? "略有压力" : "有点紧张",
          readiness: "我大致知道方向，但解释链条常常不完整",
          support: "一步一步的构造提示"
        },
        practice: {
          basis: "correct",
          property: ["self-one", "others-zero", "interpolation"],
          runge: "global-sensitive",
          transfer: "higher-global"
        },
        reflection: {
          stuck: "迁移到新情境时不会判断方法是否合适",
          check: "我简单看过一遍答案",
          calibration: "结果和我预想差不多"
        },
        expression: {
          roles: ["构造", "验证"],
          mode: "边做边讨论",
          reason: "对应节点那一项会留下来，别的项会消掉。",
          tip: "先把公式和步骤写完整，不要跳步。"
        }
      }),
      elapsedSeconds: 430 + index * 11,
      editCount: 4 + (index % 2),
      behavior: {
        hintClicks: 1,
        verifyClicks: 0,
        compareClicks: 0
      }
    };
  },

  routineTransferWeak(index) {
    return {
      form: createForm({
        selfReport: {
          confidence: "比较有把握",
          anxiety: "有点紧张",
          readiness: "我通常先套公式，再看结果是否合理",
          support: "一个最小例题"
        },
        practice: {
          basis: "correct",
          property: ["self-one", "others-zero", "interpolation", "uniqueness"],
          runge: "condition-fails",
          transfer: "higher-global"
        },
        reflection: {
          stuck: "迁移到新情境时不会判断方法是否合适",
          check: "我简单看过一遍答案",
          calibration: "结果和我预想差不多"
        },
        expression: {
          roles: ["构造", "整理"],
          mode: "边做边讨论",
          reason: "因为节点上能对上对应的函数值，所以就能通过这些点。",
          tip: "做题时先确认条件，别急着往后代。"
        }
      }),
      elapsedSeconds: 470 + index * 7,
      editCount: 5,
      behavior: {
        hintClicks: 1,
        verifyClicks: 1,
        compareClicks: 0
      }
    };
  },

  guessRight(index) {
    return {
      form: createForm({
        selfReport: {
          confidence: "一般",
          anxiety: "有点紧张",
          readiness: "我通常先套公式，再看结果是否合理",
          support: "一个最小例题"
        },
        practice: {
          basis: "linear-only",
          property: ["self-one", "others-zero", "interpolation"],
          runge: "global-sensitive",
          transfer: "higher-global"
        },
        reflection: {
          stuck: "知道插值成立，但解释不清为什么端点会振荡",
          check: "我基本没检查就提交了",
          calibration: index % 2 === 0 ? "结果和我预想差不多" : "我低估了自己"
        },
        expression: {
          roles: ["验证"],
          mode: "先自己解释，再交流",
          reason: "因为它能经过节点。",
          tip: "先把答案做出来再说。"
        }
      }),
      elapsedSeconds: 210 + index * 5,
      editCount: 2,
      behavior: {
        hintClicks: 0,
        verifyClicks: 0,
        compareClicks: 0
      }
    };
  },

  miscalibrated(index) {
    return {
      form: createForm({
        selfReport: {
          confidence: index % 2 === 0 ? "很有把握" : "比较有把握",
          anxiety: "略有压力",
          readiness: "我大致知道方向，但解释链条常常不完整",
          support: "老师集中讲解一次"
        },
        practice: {
          basis: "wrong-denominator",
          property: ["self-one"],
          runge: "condition-fails",
          transfer: "optimize-or-piecewise"
        },
        reflection: {
          stuck: "能写出式子，但说不清为什么经过节点",
          check: "我简单看过一遍答案",
          calibration: "我高估了自己"
        },
        expression: {
          roles: ["构造"],
          mode: "边做边讨论",
          reason: "我记得节点上会对应到那个值，但是链条没有完全想清楚。",
          tip: "下次还是先把公式记牢。"
        }
      }),
      elapsedSeconds: 350 + index * 14,
      editCount: 3 + (index % 2),
      behavior: {
        hintClicks: 1,
        verifyClicks: 1,
        compareClicks: 0
      }
    };
  },

  foundationRebuild(index) {
    return {
      form: createForm({
        selfReport: {
          confidence: index % 2 === 0 ? "不太有把握" : "几乎没把握",
          anxiety: index % 2 === 0 ? "比较紧张" : "很紧张",
          readiness: "我常常不知道该先看节点、误差还是方法",
          support: index % 2 === 0 ? "一个最小例题" : "老师集中讲解一次"
        },
        practice: {
          basis: "wrong-denominator",
          property: ["self-one"],
          runge: "more-nodes-always-better",
          transfer: "give-up"
        },
        reflection: {
          stuck: "构造基函数时容易漏因子或写错分母",
          check: "我主动点过验证或对比后再检查",
          calibration: "结果和我预想差不多"
        },
        expression: {
          roles: ["验证"],
          mode: "先听别人讲，再自己整理",
          reason: "我知道是要在节点上对应起来，但还不能完整解释每一步为什么这样写。",
          tip: "希望先看一个最小例子，再跟着把基函数和节点条件过一遍。"
        }
      }),
      elapsedSeconds: 760 + index * 12,
      editCount: 8 + (index % 3),
      behavior: {
        hintClicks: 2,
        verifyClicks: 2,
        compareClicks: 1
      }
    };
  },

  lowQualityRush() {
    return {
      form: createForm({
        selfReport: {
          confidence: "比较有把握",
          anxiety: "略有压力",
          readiness: "我通常先套公式，再看结果是否合理",
          support: "一步一步的构造提示"
        },
        practice: {
          basis: "correct",
          property: ["self-one", "others-zero"],
          runge: "condition-fails",
          transfer: "optimize-or-piecewise"
        },
        reflection: {
          stuck: "知道插值成立，但解释不清为什么端点会振荡",
          check: "我基本没检查就提交了",
          calibration: "结果和我预想差不多"
        },
        expression: {
          roles: ["构造"],
          mode: "边做边讨论",
          reason: "",
          tip: ""
        }
      }),
      elapsedSeconds: 96,
      editCount: 1,
      behavior: {
        hintClicks: 0,
        verifyClicks: 0,
        compareClicks: 0
      }
    };
  }
};

const STUDENT_BLUEPRINTS = [
  { name: "林知夏", studentId: "NA240201", profile: "masteryExplainer" },
  { name: "周景行", studentId: "NA240202", profile: "masteryQuiet" },
  { name: "陈予安", studentId: "NA240203", profile: "routineTemplate" },
  { name: "许望舒", studentId: "NA240204", profile: "routineTemplate" },
  { name: "沈嘉木", studentId: "NA240205", profile: "guessRight" },
  { name: "陆星阑", studentId: "NA240206", profile: "miscalibrated" },
  { name: "韩清妍", studentId: "NA240207", profile: "foundationRebuild" },
  { name: "宋砚舟", studentId: "NA240208", profile: "routineTransferWeak" },
  { name: "顾南栀", studentId: "NA240209", profile: "masteryExplainer" },
  { name: "程亦然", studentId: "NA240210", profile: "lowQualityRush" },
  { name: "叶书禾", studentId: "NA240211", profile: "foundationRebuild" },
  { name: "苏闻溪", studentId: "NA240212", profile: "guessRight" },
  { name: "梁叙白", studentId: "NA240213", profile: "routineTemplate" },
  { name: "唐可心", studentId: "NA240214", profile: "miscalibrated" },
  { name: "谢时安", studentId: "NA240215", profile: "masteryQuiet" },
  { name: "乔若宁", studentId: "NA240216", profile: "routineTransferWeak" },
  { name: "傅言川", studentId: "NA240217", profile: "masteryExplainer" },
  { name: "何映真", studentId: "NA240218", profile: "foundationRebuild" },
  { name: "蒋明岚", studentId: "NA240219", profile: "guessRight" },
  { name: "白屿川", studentId: "NA240220", profile: "routineTemplate" },
  { name: "姜语棠", studentId: "NA240221", profile: "masteryExplainer" },
  { name: "任知远", studentId: "NA240222", profile: "miscalibrated" },
  { name: "黄亦宁", studentId: "NA240223", submitted: false },
  { name: "马景初", studentId: "NA240224", submitted: false },
  { name: "范歆然", studentId: "NA240225", submitted: false }
];

function computeRiskScore(record) {
  const diagnosisRiskMap = {
    真懂: 10,
    会套: 28,
    猜对: 40,
    校准失衡: 46,
    基础待补: 52
  };

  let score = diagnosisRiskMap[record.diagnosis] || 40;
  score += (10 - record.averageDimension) * 3.2;
  score += record.meta.anxietyScore >= 4 ? 10 : record.meta.anxietyScore === 3 ? 4 : 0;
  score += record.quality.weight < 1 ? 6 : 0;
  score += record.meta.confidenceGap >= 1.8 ? 8 : 0;
  score += record.compactSummary.weakestDimension[1] < 5.5 ? 4 : 0;
  return clamp(Math.round(score), 12, 99);
}

function buildSubmittedStudent(blueprint, index) {
  const profileFactory = PROFILE_BUILDERS[blueprint.profile];
  const profile = profileFactory(index);
  const submittedAt = new Date(Date.UTC(2026, 3, 4, 1, 12 + index * 4));
  const record = buildSubmissionRecord(
    profile.form,
    profile.elapsedSeconds,
    profile.editCount,
    profile.behavior,
    submittedAt
  );

  const weakestDimensionKey = record.compactSummary.weakestDimension[0];
  const strongestDimensionKey = record.compactSummary.strongestDimension[0];
  const riskScore = computeRiskScore(record);

  return {
    id: `student-${index + 1}`,
    name: blueprint.name,
    studentId: blueprint.studentId,
    avatarLabel: blueprint.name.slice(0, 1),
    submitted: true,
    riskScore,
    riskBand: riskScore >= 80 ? "高" : riskScore >= 60 ? "中" : "低",
    record,
    diagnosis: record.diagnosis,
    qualityBand: record.quality.band,
    qualityWeight: record.quality.weight,
    averageDimension: record.averageDimension,
    weakestDimensionKey,
    strongestDimensionKey,
    weakestDimensionLabel: dimensionLabels[weakestDimensionKey],
    strongestDimensionLabel: dimensionLabels[strongestDimensionKey],
    confidenceGap: record.meta.confidenceGap,
    supportNeed: record.meta.supportNeed,
    collaborationMode: record.meta.collaborationMode,
    anxietyScore: record.meta.anxietyScore,
    primaryRole: record.meta.primaryRole,
    elapsedSeconds: profile.elapsedSeconds,
    editCount: profile.editCount,
    teacherActionShort: `${record.diagnosis === "真懂" ? "带讲解" : record.diagnosis === "会套" ? "补解释" : record.diagnosis === "猜对" ? "补过程" : record.diagnosis === "校准失衡" ? "先校准" : "补基础"} · ${dimensionLabels[weakestDimensionKey]}`,
    submissionStatusLabel: "已提交"
  };
}

function buildUnsubmittedStudent(blueprint, index) {
  return {
    id: `student-${index + 1}`,
    name: blueprint.name,
    studentId: blueprint.studentId,
    avatarLabel: blueprint.name.slice(0, 1),
    submitted: false,
    riskScore: 98,
    riskBand: "高",
    diagnosis: "未提交",
    qualityBand: "待采集",
    qualityWeight: 0,
    averageDimension: null,
    weakestDimensionKey: null,
    weakestDimensionLabel: "待采集",
    strongestDimensionKey: null,
    strongestDimensionLabel: "待采集",
    confidenceGap: null,
    supportNeed: "待采集",
    collaborationMode: "待采集",
    anxietyScore: null,
    primaryRole: "待采集",
    elapsedSeconds: null,
    editCount: null,
    teacherActionShort: "优先催交并补采集完整证据",
    submissionStatusLabel: "未提交",
    record: null
  };
}

export function buildMockStudentDataset() {
  return STUDENT_BLUEPRINTS.map((blueprint, index) =>
    blueprint.submitted === false
      ? buildUnsubmittedStudent(blueprint, index)
      : buildSubmittedStudent(blueprint, index)
  );
}
