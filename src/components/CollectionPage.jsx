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

const roleOptionMap = {
  "讲解思路": { value: "讲解", exportValue: "讲解" },
  "负责计算": { value: "计算", exportValue: "计算" },
  "检查答案": { value: "验证", exportValue: "验证" },
  "整理结论": { value: "整理", exportValue: "组织" },
  "组织分工": { value: "组织", exportValue: "组织" }
};

const roleLabelMap = Object.fromEntries(
  Object.entries(roleOptionMap).map(([label, config]) => [config.value, label])
);

const roleExportMap = Object.fromEntries(
  Object.values(roleOptionMap).map((config) => [config.value, config.exportValue])
);

const masteryOptions = [
  { value: "很熟悉", description: "相关概念和步骤基本能独立说清。" },
  { value: "比较熟悉", description: "大体知道怎么做，但细节还会犹豫。" },
  { value: "一般", description: "能回忆起部分内容，但不够稳定。" },
  { value: "不太熟悉", description: "需要提示后才能开始。" },
  { value: "很不熟悉", description: "目前还没有形成清晰思路。" }
];

const anxietyOptions = [
  { value: "很轻松", description: "做题时比较放松。" },
  { value: "略有压力", description: "有一点紧张，但基本可控。" },
  { value: "有点紧张", description: "会担心做错或做不完。" },
  { value: "比较紧张", description: "明显焦虑，容易影响发挥。" },
  { value: "很紧张", description: "压力很大，容易卡住。" }
];

const clarityOptions = [
  { value: "很清楚", description: "我能较快知道自己卡在哪一步。" },
  { value: "大致清楚", description: "大概知道问题在哪，但不够稳定。" },
  { value: "不太清楚", description: "常常知道不会，但说不清原因。" },
  { value: "完全不清楚", description: "卡住时经常不知道从哪里补起。" }
];

const participationOptions = [
  { value: "我会主动完成并愿意交流", description: "能主动推进，也愿意参与讨论。" },
  { value: "我能按要求完成，也愿意简单交流", description: "基本按要求完成，交流偏保守。" },
  { value: "我需要提醒后才能推进", description: "需要外部提醒才会继续。" },
  { value: "我经常拖到最后才提交", description: "经常被动完成，推进较慢。" }
];

const practiceQuestions = [
  {
    id: "basis",
    label: "基函数构造",
    type: "single",
    title: "题1 基础判断题",
    prompt: "在区间 \\([x_i, x_{i+1}]\\) 上，一段三次 Hermite 插值要被唯一确定，通常需要哪组信息？",
    options: [
      { value: "endpoint-values", label: "只需要两个端点的函数值", description: "忽略导数条件。" },
      { value: "full-hermite", label: "两个端点函数值和两个端点导数值", description: "每段四个条件。" },
      { value: "midpoint", label: "中点函数值和导数值即可", description: "把局部条件理解错了。" },
      { value: "derivative-only", label: "只要端点导数，不需要函数值", description: "少了函数值条件。" }
    ]
  },
  {
    id: "fraction",
    label: "分式运算",
    type: "input",
    title: "题2 计算题",
    prompt: "若 \\(t = \\frac{x - x_0}{x_1 - x_0}\\)，且 \\(x_0 = 1\\)，\\(x_1 = 3\\)，\\(x = 2\\)，则 \\(t = ?\\)",
    placeholder: "请输入 0.5 或 1/2"
  },
  {
    id: "verify",
    label: "节点验证",
    type: "multiple",
    title: "题3 步骤判断题",
    prompt: "要验证一段 Hermite 插值式满足节点条件，应检查哪些关系？（可多选）",
    options: [
      { value: "left-value", label: "\\(H(x_i)=y_i\\)", description: "左端点函数值条件。" },
      { value: "right-value", label: "\\(H(x_{i+1})=y_{i+1}\\)", description: "右端点函数值条件。" },
      { value: "left-derivative", label: "\\(H'(x_i)=d_i\\)", description: "左端点导数条件。" },
      { value: "right-derivative", label: "\\(H'(x_{i+1})=d_{i+1}\\)", description: "右端点导数条件。" },
      { value: "second-derivative", label: "只要 \\(H''(x_i)=0\\) 即可", description: "这是错误条件。" }
    ]
  },
  {
    id: "structure",
    label: "结构概括",
    type: "single",
    title: "题4 方法概括题",
    prompt: "PCHIP 在实际数据处理中更常被看重的特点是：",
    options: [
      { value: "higher-order", label: "次数更高，所以一定更精确", description: "把高次和效果简单等同。" },
      { value: "shape-preserving", label: "能保持局部形状和单调性，更不容易振荡", description: "强调保形与局部稳定。" },
      { value: "no-nodes", label: "不需要节点值，只要斜率即可", description: "把输入条件理解错了。" },
      { value: "equal-spacing", label: "只适用于等距节点", description: "对适用条件的误解。" }
    ]
  }
];

const reflectionOptions = {
  stuck: [
    { value: "读题后不知道从哪里开始", description: "需要先找到切入口。" },
    { value: "知道思路但不会列式", description: "知道方向，但不会落到步骤。" },
    { value: "计算过程中容易出错", description: "中间运算容易丢分。" },
    { value: "结果出来后不会检查", description: "缺少验证意识。" },
    { value: "基本没有困难", description: "整体比较顺畅。" }
  ],
  support: [
    { value: "一个例题", description: "希望先看一题做法。" },
    { value: "一个步骤提示", description: "更需要被点一下关键步骤。" },
    { value: "一个公式提醒", description: "对公式或条件容易忘。" },
    { value: "同学讨论", description: "更适合和同伴讨论后推进。" },
    { value: "老师讲解", description: "希望由老师直接讲清。" }
  ],
  check: [
    { value: "认真检查过程", description: "会回看条件、步骤和结果。" },
    { value: "简单看一下", description: "会快速扫一眼。" },
    { value: "基本不检查", description: "通常提交前不会专门回看。" }
  ]
};

const collaborationModeOptions = [
  { value: "先自己做，再交流", description: "先独立完成，再交换思路。" },
  { value: "边做边讨论", description: "希望在讨论中推进。" },
  { value: "听别人讲后再尝试", description: "先理解他人思路，再动手。" },
  { value: "负责检查与整理", description: "更愿意承担收尾和统整工作。" }
];

const roleChoiceOptions = Object.entries(roleOptionMap).map(([label, config]) => ({
  value: config.value,
  label,
  description: "可作为小组中的任务偏好。"
}));

const anxietyScoreMap = {
  很轻松: 1,
  略有压力: 2,
  有点紧张: 3,
  比较紧张: 4,
  很紧张: 5
};

const clarityExportMap = {
  很清楚: "知道",
  大致清楚: "模糊",
  不太清楚: "不知道",
  完全不清楚: "不知道"
};

const participationScoreMap = {
  "我会主动完成并愿意交流": 9,
  "我能按要求完成，也愿意简单交流": 7,
  "我需要提醒后才能推进": 5,
  "我经常拖到最后才提交": 3
};

const modeScoreMap = {
  "先自己做，再交流": 6,
  "边做边讨论": 7,
  "听别人讲后再尝试": 4,
  "负责检查与整理": 5
};

const roleScoreMap = {
  讲解: 2,
  计算: 1,
  验证: 1,
  整理: 2,
  组织: 2
};

function createEmptyForm() {
  return {
    selfReport: {
      mastery: "",
      anxiety: "",
      clarity: "",
      participation: ""
    },
    practice: {
      basis: "",
      fraction: "",
      verify: [],
      structure: ""
    },
    reflection: {
      stuck: "",
      support: "",
      check: ""
    },
    collaboration: {
      roles: [],
      mode: "",
      expression: ""
    }
  };
}

function createDemoForm() {
  return {
    selfReport: {
      mastery: "一般",
      anxiety: "有点紧张",
      clarity: "大致清楚",
      participation: "我能按要求完成，也愿意简单交流"
    },
    practice: {
      basis: "full-hermite",
      fraction: "1/2",
      verify: ["left-value", "right-value", "left-derivative"],
      structure: "shape-preserving"
    },
    reflection: {
      stuck: "知道思路但不会列式",
      support: "一个步骤提示",
      check: "简单看一下"
    },
    collaboration: {
      roles: ["计算", "整理"],
      mode: "先自己做，再交流",
      expression: "先确认每段满足哪些节点条件，再去判断公式和步骤是否完整。"
    }
  };
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds.toString().padStart(2, "0")}秒`;
}

function normalizeInput(value) {
  return value.trim().replace(/\s+/g, "").replace(/，/g, ",");
}

function evaluatePractice(practice) {
  const basisResult = (() => {
    if (practice.basis === "full-hermite") {
      return { id: "basis", label: "基函数构造", score: 9.2, errorType: "正确", correct: true };
    }

    if (practice.basis === "endpoint-values") {
      return { id: "basis", label: "基函数构造", score: 5.2, errorType: "概念误解", correct: false };
    }

    if (practice.basis === "midpoint") {
      return { id: "basis", label: "基函数构造", score: 4.6, errorType: "概念误解", correct: false };
    }

    if (practice.basis === "derivative-only") {
      return { id: "basis", label: "基函数构造", score: 4.3, errorType: "概念误解", correct: false };
    }

    return { id: "basis", label: "基函数构造", score: 0, errorType: "未作答", correct: false };
  })();

  const fractionResult = (() => {
    const normalized = normalizeInput(practice.fraction);
    const correctAnswers = new Set(["0.5", "1/2", "0.50", "0.500"]);

    if (!normalized) {
      return { id: "fraction", label: "分式运算", score: 0, errorType: "未作答", correct: false };
    }

    if (correctAnswers.has(normalized)) {
      return { id: "fraction", label: "分式运算", score: 8.9, errorType: "正确", correct: true };
    }

    return { id: "fraction", label: "分式运算", score: 5.0, errorType: "运算错误", correct: false };
  })();

  const verifyResult = (() => {
    const selected = practice.verify || [];
    const correctSet = new Set(["left-value", "right-value", "left-derivative", "right-derivative"]);
    const correctCount = selected.filter((value) => correctSet.has(value)).length;
    const hasWrongCondition = selected.includes("second-derivative");

    if (correctCount === 4 && !hasWrongCondition) {
      return { id: "verify", label: "节点验证", score: 8.8, errorType: "正确", correct: true };
    }

    if (hasWrongCondition) {
      return {
        id: "verify",
        label: "节点验证",
        score: correctCount >= 2 ? 4.8 : 4.2,
        errorType: "概念误解",
        correct: false
      };
    }

    if (correctCount >= 2) {
      return { id: "verify", label: "节点验证", score: 6.3, errorType: "步骤遗漏", correct: false };
    }

    if (correctCount === 1) {
      return { id: "verify", label: "节点验证", score: 5.1, errorType: "步骤遗漏", correct: false };
    }

    return { id: "verify", label: "节点验证", score: 0, errorType: "未作答", correct: false };
  })();

  const structureResult = (() => {
    if (practice.structure === "shape-preserving") {
      return { id: "structure", label: "结构概括", score: 8.7, errorType: "正确", correct: true };
    }

    if (practice.structure) {
      return { id: "structure", label: "结构概括", score: 4.6, errorType: "概念误解", correct: false };
    }

    return { id: "structure", label: "结构概括", score: 0, errorType: "未作答", correct: false };
  })();

  return [basisResult, fractionResult, verifyResult, structureResult];
}

function derivePrimaryRole(selectedRoles) {
  if (!selectedRoles.length) {
    return "待定";
  }

  return roleExportMap[selectedRoles[0]] || selectedRoles[0];
}

function deriveExpressionCollaborationIndex(form) {
  const roleBonus = form.collaboration.roles.reduce(
    (sum, role) => sum + (roleScoreMap[role] || 0),
    0
  );
  const modeScore = modeScoreMap[form.collaboration.mode] || 4;
  const textLength = form.collaboration.expression.trim().length;
  const textBonus = textLength >= 20 ? 1 : textLength >= 8 ? 0 : -1;
  const checkBonus = form.reflection.check === "认真检查过程" ? 1 : 0;
  const result = 3 + Math.round((modeScore + roleBonus + textBonus + checkBonus) / 2);
  return Math.max(3, Math.min(9, result));
}

function deriveLearningStatus(averageScore, weakestItem, metaLabel) {
  if (averageScore >= 8.2) {
    return "课前掌握较稳，可直接进入合作探究。";
  }

  if (averageScore >= 6.8) {
    return `基础已具备，但 ${weakestItem.label} 还需要教师提醒。`;
  }

  if (averageScore >= 5.5) {
    return `需要步骤支架，建议先把 ${weakestItem.label} 做稳。`;
  }

  if (metaLabel === "不知道") {
    return "知识切入点不稳定，建议先用例题和提示搭梯子。";
  }

  return `建议从 ${weakestItem.label} 开始补强，再进入小组任务。`;
}

function deriveGroupTag(averageScore, anxietyScore, participationScore, metaLabel, practiceResults) {
  const scores = Object.fromEntries(practiceResults.map((item) => [item.id, item.score]));
  const maxScore = Math.max(...practiceResults.map((item) => item.score));

  if (anxietyScore >= 4 && averageScore >= 6.5) {
    return "焦虑高能型";
  }

  if (averageScore >= 8 && participationScore >= 7) {
    return "全能型候选";
  }

  if (scores.fraction === maxScore && scores.structure <= 6.5) {
    return "偏计算型";
  }

  if (participationScore <= 4) {
    return "参与激活型";
  }

  if (averageScore < 6 && metaLabel === "不知道") {
    return "理解支架优先";
  }

  return "待继续观察";
}

function deriveSupportNeed(form, weakestItem) {
  const support = form.reflection.support;

  if (support === "一个例题") {
    return `先给 ${weakestItem.label} 的同类例题，再让学生独立尝试。`;
  }

  if (support === "一个步骤提示") {
    return `优先提供 ${weakestItem.label} 的步骤提示。`;
  }

  if (support === "一个公式提醒") {
    return `先提醒相关公式和条件，再引导学生完成 ${weakestItem.label}。`;
  }

  if (support === "同学讨论") {
    return "安排与讲解型或组织型同伴先讨论，再完成任务。";
  }

  return "建议教师做一次短讲解后，再安排跟做与复述。";
}

function deriveGroupingHint(primaryRole, groupTag, form) {
  const roleText = roleLabelMap[primaryRole] || primaryRole;

  if (groupTag === "焦虑高能型") {
    return `建议与节奏稳定、愿意讲解的同伴同组，先承担“${roleText}”这类边界清晰的任务。`;
  }

  if (groupTag === "偏计算型") {
    return `建议与讲解型或整理型同伴互补，自己可承担“${roleText}”。`;
  }

  if (groupTag === "参与激活型") {
    return "建议分入角色明确、任务切分清晰的小组，由组织型同伴带动推进。";
  }

  if (groupTag === "理解支架优先") {
    return `建议与讲解型、验证型同伴搭配，并先用“${form.reflection.support}”做支架。`;
  }

  return `可保留“${roleText}”任务，同时搭配互补角色提升协作效率。`;
}

function buildSubmissionRecord(form, elapsedSeconds, editCount) {
  const practiceResults = evaluatePractice(form.practice);
  const averageScore = Number(
    (practiceResults.reduce((sum, item) => sum + item.score, 0) / practiceResults.length).toFixed(2)
  );
  const anxietyScore = anxietyScoreMap[form.selfReport.anxiety];
  const metaLabel = clarityExportMap[form.selfReport.clarity];
  const participationScore = participationScoreMap[form.selfReport.participation];
  const primaryRole = derivePrimaryRole(form.collaboration.roles);
  const collaborationIndex = deriveExpressionCollaborationIndex(form);
  const weakestItem = [...practiceResults].sort((a, b) => a.score - b.score)[0];
  const strongestItem = [...practiceResults].sort((a, b) => b.score - a.score)[0];
  const groupTag = deriveGroupTag(
    averageScore,
    anxietyScore,
    participationScore,
    metaLabel,
    practiceResults
  );
  const learningStatus = deriveLearningStatus(averageScore, weakestItem, metaLabel);
  const supportNeed = deriveSupportNeed(form, weakestItem);
  const groupingHint = deriveGroupingHint(primaryRole, groupTag, form);
  const selectedRoleLabels = form.collaboration.roles.map((role) => roleLabelMap[role] || role);
  const submittedAtLabel = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return {
    submittedAtLabel,
    elapsedLabel: formatDuration(elapsedSeconds),
    practiceResults,
    averageScore,
    learningStatus,
    groupTag,
    supportNeed,
    groupingHint,
    compactSummary: {
      primaryRole,
      strongestItem,
      weakestItem,
      collaborationIndex
    },
    inputData: [
      { label: "掌握程度", value: form.selfReport.mastery },
      { label: "焦虑感", value: `${form.selfReport.anxiety}（${anxietyScore}）` },
      { label: "元认知清晰度", value: `${form.selfReport.clarity} → ${metaLabel}` },
      { label: "参与主动性", value: `${form.selfReport.participation}（${participationScore}）` },
      {
        label: "角色偏好（原始）",
        value: selectedRoleLabels.length ? selectedRoleLabels.join("、") : "未填写"
      },
      { label: "合作方式", value: form.collaboration.mode },
      { label: "一句话表达", value: form.collaboration.expression.trim() }
    ],
    autoData: [
      ...practiceResults.map((item) => ({
        label: item.label,
        value: `${item.score.toFixed(1)} 分 · ${item.errorType}`
      })),
      { label: "完成时间", value: formatDuration(elapsedSeconds) },
      { label: "修改次数", value: `${editCount} 次` }
    ],
    derivedData: [
      { label: "综合均分", value: averageScore.toFixed(2) },
      { label: "主要角色标签", value: primaryRole },
      { label: "表达合作指数", value: String(collaborationIndex) },
      { label: "当前掌握情况", value: learningStatus },
      { label: "分组参考标签", value: groupTag },
      { label: "建议支架", value: supportNeed }
    ]
  };
}

function getProgress(form) {
  const sectionProgress = {
    selfReport: [
      form.selfReport.mastery,
      form.selfReport.anxiety,
      form.selfReport.clarity,
      form.selfReport.participation
    ].filter(Boolean).length,
    practice: [
      form.practice.basis,
      form.practice.fraction.trim(),
      form.practice.verify.length > 0 ? "done" : "",
      form.practice.structure
    ].filter(Boolean).length,
    reflection: [
      form.reflection.stuck,
      form.reflection.support,
      form.reflection.check
    ].filter(Boolean).length,
    collaboration: [
      form.collaboration.roles.length > 0 ? "done" : "",
      form.collaboration.mode,
      form.collaboration.expression.trim().length >= 5 ? "done" : ""
    ].filter(Boolean).length
  };

  const completed = Object.values(sectionProgress).reduce((sum, count) => sum + count, 0);
  return {
    sectionProgress,
    completed,
    total: 14,
    ratio: completed / 14
  };
}

function getMissingSections(form) {
  const missing = [];

  if (
    !form.selfReport.mastery ||
    !form.selfReport.anxiety ||
    !form.selfReport.clarity ||
    !form.selfReport.participation
  ) {
    missing.push("学习自评");
  }

  if (
    !form.practice.basis ||
    !form.practice.fraction.trim() ||
    form.practice.verify.length === 0 ||
    !form.practice.structure
  ) {
    missing.push("课前小练");
  }

  if (
    !form.reflection.stuck ||
    !form.reflection.support ||
    !form.reflection.check
  ) {
    missing.push("过程反思");
  }

  if (
    form.collaboration.roles.length === 0 ||
    !form.collaboration.mode ||
    form.collaboration.expression.trim().length < 5
  ) {
    missing.push("合作偏好与表达");
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
      <span style={{ color: "#6b7280", fontSize: 12 }}>{label}</span>
      <strong style={{ color: "#111827", fontSize: 14, lineHeight: 1.6 }}>{value}</strong>
    </div>
  );
}

export function CollectionPage({ onOpenGrouping }) {
  const [form, setForm] = useState(() => createEmptyForm());
  const [editCount, setEditCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [submitError, setSubmitError] = useState("");
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [isSubmittedDirty, setIsSubmittedDirty] = useState(false);
  const startedAtRef = useRef(Date.now());
  const previewRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!submittedRecord || !previewRef.current) {
      return;
    }

    previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function toggleVerifyOption(value) {
    setForm((current) => {
      const nextValues = current.practice.verify.includes(value)
        ? current.practice.verify.filter((item) => item !== value)
        : [...current.practice.verify, value];

      return {
        ...current,
        practice: {
          ...current.practice,
          verify: nextValues
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
      const alreadySelected = current.collaboration.roles.includes(value);
      const nextRoles = alreadySelected
        ? current.collaboration.roles.filter((role) => role !== value)
        : current.collaboration.roles.length >= 2
          ? current.collaboration.roles
          : [...current.collaboration.roles, value];

      return {
        ...current,
        collaboration: {
          ...current.collaboration,
          roles: nextRoles
        }
      };
    });
    markEdited();
  }

  function updateCollaboration(key, value) {
    setForm((current) => ({
      ...current,
      collaboration: {
        ...current.collaboration,
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
    setEditCount(0);
    setSubmitError("");
    setSubmittedRecord(null);
    setIsSubmittedDirty(false);
    resetTiming();
  }

  function clearForm() {
    setForm(createEmptyForm());
    setEditCount(0);
    setSubmitError("");
    setSubmittedRecord(null);
    setIsSubmittedDirty(false);
    resetTiming();
  }

  function handleSubmit(event) {
    event.preventDefault();

    const missingSections = getMissingSections(form);
    if (missingSections.length > 0) {
      setSubmitError(`还需要完成：${missingSections.join("、")}。`);
      return;
    }

    const record = buildSubmissionRecord(form, elapsedSeconds, editCount);
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
                  background: TONES.sage.soft,
                  color: TONES.sage.text,
                  border: `1px solid ${TONES.sage.border}`
                }}
              >
                课前学习情况与练习采集
              </span>

              <div style={{ display: "grid", gap: 8 }}>
                <h2 className="tool-page-title">学生作答页</h2>
                <p className="tool-page-summary">请完成以下自评、练习和简短反馈。</p>
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
              { label: "预计时长", value: "约 6 分钟" },
              { label: "采集模块", value: "4 类" },
              { label: "诊断练习", value: "4 题" },
              { label: "系统记录", value: "答案、时间、修改情况" }
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
              title="学习自评"
              caption="这一部分采集学生主动填写的学习状态，后续可对应到焦虑感、元认知清晰度、参与主动性等字段。"
              tone="sage"
              progressText={`${progress.sectionProgress.selfReport} / 4 已完成`}
            >
              <QuestionCard title="你对本节内容的掌握程度如何？" fieldLabel="掌握程度" tone="sage">
                <ChoiceGroup
                  options={masteryOptions}
                  value={form.selfReport.mastery}
                  onChange={(value) => updateSelfReport("mastery", value)}
                  tone="sage"
                />
              </QuestionCard>

              <QuestionCard title="完成课前任务时，你的感受更接近：" fieldLabel="焦虑感" tone="sage">
                <ChoiceGroup
                  options={anxietyOptions}
                  value={form.selfReport.anxiety}
                  onChange={(value) => updateSelfReport("anxiety", value)}
                  tone="sage"
                />
              </QuestionCard>

              <QuestionCard
                title="做题时，你是否能清楚知道自己卡在哪里？"
                fieldLabel="元认知清晰度"
                tone="sage"
              >
                <ChoiceGroup
                  options={clarityOptions}
                  value={form.selfReport.clarity}
                  onChange={(value) => updateSelfReport("clarity", value)}
                  tone="sage"
                />
              </QuestionCard>

              <QuestionCard
                title="完成课前任务时，你通常更接近哪种状态？"
                fieldLabel="参与主动性"
                tone="sage"
              >
                <ChoiceGroup
                  options={participationOptions}
                  value={form.selfReport.participation}
                  onChange={(value) => updateSelfReport("participation", value)}
                  tone="sage"
                />
              </QuestionCard>
            </SectionCard>

            <SectionCard
              index="02"
              title="课前小练"
              caption="这一部分直接对应 Excel 中的四个知识点得分和四类错误类型。系统会根据你的答案自动评分并记录完成时间。"
              tone="blue"
              progressText={`${progress.sectionProgress.practice} / 4 已完成`}
            >
              <QuestionCard
                title={practiceQuestions[0].title}
                hint={practiceQuestions[0].prompt}
                fieldLabel="基函数构造得分 / 错误类型"
                tone="blue"
              >
                <ChoiceGroup
                  options={practiceQuestions[0].options}
                  value={form.practice.basis}
                  onChange={(value) => updatePractice("basis", value)}
                  tone="blue"
                />
              </QuestionCard>

              <QuestionCard
                title={practiceQuestions[1].title}
                hint={practiceQuestions[1].prompt}
                fieldLabel="分式运算得分 / 错误类型"
                tone="blue"
              >
                <input
                  value={form.practice.fraction}
                  onChange={(event) => updatePractice("fraction", event.target.value)}
                  placeholder={practiceQuestions[1].placeholder}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 16,
                    border: "1px solid rgba(31,31,26,0.1)",
                    background: "rgba(255,255,255,0.94)",
                    color: "#111827"
                  }}
                />
              </QuestionCard>

              <QuestionCard
                title={practiceQuestions[2].title}
                hint={practiceQuestions[2].prompt}
                fieldLabel="节点验证得分 / 错误类型"
                tone="blue"
                footer="至少选出你认为需要检查的条件；系统会根据选择判断是“步骤遗漏”还是“概念误解”。"
              >
                <MultiChoiceGroup
                  options={practiceQuestions[2].options}
                  values={form.practice.verify}
                  onToggle={toggleVerifyOption}
                  tone="blue"
                />
              </QuestionCard>

              <QuestionCard
                title={practiceQuestions[3].title}
                hint={practiceQuestions[3].prompt}
                fieldLabel="结构概括得分 / 错误类型"
                tone="blue"
              >
                <ChoiceGroup
                  options={practiceQuestions[3].options}
                  value={form.practice.structure}
                  onChange={(value) => updatePractice("structure", value)}
                  tone="blue"
                />
              </QuestionCard>
            </SectionCard>

            <SectionCard
              index="03"
              title="过程反思"
              caption="这里记录的不是最后答案，而是你在作答过程中感受到的卡点、需要的帮助以及检查习惯。"
              tone="amber"
              progressText={`${progress.sectionProgress.reflection} / 3 已完成`}
            >
              <QuestionCard title="在刚才这组练习里，你主要卡在哪一步？" fieldLabel="困难位置" tone="amber">
                <ChoiceGroup
                  options={reflectionOptions.stuck}
                  value={form.reflection.stuck}
                  onChange={(value) => updateReflection("stuck", value)}
                  tone="amber"
                />
              </QuestionCard>

              <QuestionCard title="如果可以获得一个帮助，你最希望是哪一种？" fieldLabel="支架偏好" tone="amber">
                <ChoiceGroup
                  options={reflectionOptions.support}
                  value={form.reflection.support}
                  onChange={(value) => updateReflection("support", value)}
                  tone="amber"
                />
              </QuestionCard>

              <QuestionCard title="提交答案前，你通常会：" fieldLabel="检查习惯" tone="amber">
                <ChoiceGroup
                  options={reflectionOptions.check}
                  value={form.reflection.check}
                  onChange={(value) => updateReflection("check", value)}
                  tone="amber"
                />
              </QuestionCard>
            </SectionCard>

            <SectionCard
              index="04"
              title="合作偏好与表达"
              caption="这一部分用来采集角色偏好、合作方式和一句话表达，后续可整理成角色标签与表达合作指数。"
              tone="rose"
              progressText={`${progress.sectionProgress.collaboration} / 3 已完成`}
            >
              <QuestionCard
                title="在小组活动中，你更愿意承担哪些任务？"
                hint="最多选 2 项"
                fieldLabel="角色偏好（原始）/ 主要角色标签"
                tone="rose"
              >
                <MultiChoiceGroup
                  options={roleChoiceOptions}
                  values={form.collaboration.roles}
                  onToggle={toggleRole}
                  tone="rose"
                  limit={2}
                />
              </QuestionCard>

              <QuestionCard
                title="如果和同伴一起完成这道题，你更愿意："
                fieldLabel="合作方式 / 表达合作指数"
                tone="rose"
              >
                <ChoiceGroup
                  options={collaborationModeOptions}
                  value={form.collaboration.mode}
                  onChange={(value) => updateCollaboration("mode", value)}
                  tone="rose"
                />
              </QuestionCard>

              <QuestionCard
                title="请用一句话说明你认为这组题里最关键的一步是什么。"
                fieldLabel="一句话表达 / 表达合作指数"
                tone="rose"
                footer="不少于 5 个字，系统会保留原始文本，并结合合作偏好整理表达合作指标。"
              >
                <textarea
                  value={form.collaboration.expression}
                  onChange={(event) => updateCollaboration("expression", event.target.value)}
                  placeholder="例如：先确认每段插值要满足哪些节点条件，再去判断公式是否完整。"
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
                {form.collaboration.expression.trim() &&
                form.collaboration.expression.trim().length < 5 ? (
                  <span style={{ color: "#b42318", fontSize: 12 }}>再写具体一点，至少 5 个字。</span>
                ) : null}
              </QuestionCard>
            </SectionCard>

            <SurfaceCard style={{ padding: 24, display: "grid", gap: 14 }}>
              <h3 style={{ margin: 0, fontSize: 20, color: "#111827" }}>本页如何记录学习数据</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <InfoRow
                  label="学生主动填写"
                  value="学习自评、焦虑感、元认知清晰度、参与状态、角色偏好、合作方式和一句话表达。"
                />
                <InfoRow
                  label="系统自动记录"
                  value="四个知识点的作答结果、对应错误类型、开始时间、提交时间、总用时和修改次数。"
                />
                <InfoRow
                  label="教师后续整理"
                  value="综合均分、当前掌握情况、分组参考标签、建议支架等教学分析指标。"
                />
              </div>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13, lineHeight: 1.8 }}>
                为提高数据有效性，系统会进行基础质量检查，包括作答时间、完成情况和异常作答模式；
                这些检查只用于减少随意作答对教学分析的影响。
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
                  <strong style={{ fontSize: 18, color: "#111827" }}>提交本页作答</strong>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>
                    提交后页面会生成一份对应 Excel 字段的数据预览，便于演示这些数据是怎样产生的。
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
                  提交并生成数据预览
                </button>
              </div>
            </SurfaceCard>

            {submittedRecord ? (
              <div ref={previewRef}>
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
                      <h3 style={{ margin: 0, fontSize: 22, color: "#111827" }}>提交后生成的数据预览</h3>
                      <p style={{ margin: 0, color: "#4b5563", fontSize: 14, lineHeight: 1.8 }}>
                        下面这组字段就是后续进入 Excel 或教学分析表的来源示意。
                        其中“原始填写”和“系统记录”来自学生作答，“教师整理”是后续分析生成的指标。
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 16,
                        border: `1px solid ${TONES.sage.border}`,
                        background: TONES.sage.soft,
                        color: TONES.sage.text,
                        fontSize: 13,
                        fontWeight: 700
                      }}
                    >
                      已提交 · {submittedRecord.submittedAtLabel}
                    </div>
                  </div>

                  {isSubmittedDirty ? (
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: 16,
                        background: TONES.amber.soft,
                        border: `1px solid ${TONES.amber.border}`,
                        color: TONES.amber.text,
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      你在提交后又修改了内容。当前预览还是上一次提交时生成的记录，重新提交后会刷新。
                    </div>
                  ) : null}

                  <div className="tool-page-data-grid">
                    <div className="tool-page-data-column">
                      <strong style={{ color: "#111827" }}>学生主动填写</strong>
                      {submittedRecord.inputData.map((item) => (
                        <InfoRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>

                    <div className="tool-page-data-column">
                      <strong style={{ color: "#111827" }}>系统自动记录</strong>
                      {submittedRecord.autoData.map((item) => (
                        <InfoRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>

                    <div className="tool-page-data-column">
                      <strong style={{ color: "#111827" }}>教师后续整理</strong>
                      {submittedRecord.derivedData.map((item) => (
                        <InfoRow key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>
                  </div>

                  <div className="tool-page-summary-row">
                    <span style={{ color: "#6b7280", fontSize: 13 }}>
                      这份预览说明了：Excel 里的字段不是凭空出现的，而是由学生在本页的填写、作答和反思一步步生成的。
                    </span>

                    {onOpenGrouping ? (
                      <button
                        type="button"
                        onClick={onOpenGrouping}
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
                        查看这些数据如何用于分组
                      </button>
                    ) : null}
                  </div>
                </SurfaceCard>
              </div>
            ) : null}
          </form>

          <div className="tool-page-rail">
            <div className="tool-page-rail-sticky">
              <SurfaceCard style={{ padding: 22, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <strong style={{ color: "#111827", fontSize: 18 }}>当前完成进度</strong>
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
                      background: "linear-gradient(90deg, #10a37f 0%, #4f7cff 100%)"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { label: "学习自评", value: `${progress.sectionProgress.selfReport} / 4` },
                    { label: "课前小练", value: `${progress.sectionProgress.practice} / 4` },
                    { label: "过程反思", value: `${progress.sectionProgress.reflection} / 3` },
                    { label: "合作偏好与表达", value: `${progress.sectionProgress.collaboration} / 3` },
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
                <strong style={{ color: "#111827", fontSize: 18 }}>本次提交将生成</strong>
                <div className="tool-note-list">
                  {[
                  "学生主动填写的数据：掌握程度、焦虑感、元认知清晰度、参与状态、角色偏好。",
                  "完成练习自动生成的数据：四个知识点得分、错误类型、完成时间、修改次数。",
                  "教师后续整理的指标：综合均分、当前掌握情况、分组参考标签、建议支架。"
                  ].map((item) => (
                    <div key={item} className="tool-note-card">
                      {item}
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard style={{ padding: 22, display: "grid", gap: 12 }}>
                <strong style={{ color: "#111827", fontSize: 18 }}>演示辅助</strong>
                <div style={{ display: "grid", gap: 10 }}>
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
                    还原为空白学生页
                  </button>
                  {onOpenGrouping ? (
                    <button
                      type="button"
                      onClick={onOpenGrouping}
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
                      直接切到分组结果页
                    </button>
                  ) : null}
                </div>
              </SurfaceCard>

              {submittedRecord ? (
                <SurfaceCard style={{ padding: 22, display: "grid", gap: 12 }}>
                  <strong style={{ color: "#111827", fontSize: 18 }}>本次提交摘要</strong>
                  <InfoRow label="综合均分" value={submittedRecord.averageScore.toFixed(2)} />
                  <InfoRow label="分组参考标签" value={submittedRecord.groupTag} />
                  <InfoRow
                    label="当前最强项"
                    value={submittedRecord.compactSummary.strongestItem.label}
                  />
                  <InfoRow
                    label="当前需提醒"
                    value={submittedRecord.compactSummary.weakestItem.label}
                  />
                  <InfoRow
                    label="表达合作指数"
                    value={String(submittedRecord.compactSummary.collaborationIndex)}
                  />
                </SurfaceCard>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
