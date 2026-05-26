import { useEffect, useMemo, useState } from "react";
import "./TeacherFeedbackDashboard.css";
import { InlineMathText } from "./InlineMathText";
import { MathFormula } from "./MathFormula";
import { DataManagementModal } from "./DataManagementModal";
import { getStoredLagrangeDashboardStudents, saveLagrangeDashboardStudents } from "../utils/studentDataStore";
import {
  buildMockStudentDataset,
  diagnosisMeta,
  dimensionLabels,
  qualityMeta
} from "../data/lagrangeTeacherMockData";

const ANALYSIS_THRESHOLD = 6.5;
const SYSTEM_TITLE = "教师课后统计反馈系统";
const CLASS_NAME = "23级计算机科学与技术1班";
const COURSE_LABEL = "拉格朗日插值 · 教师端";

const DIMENSION_THEME = {
  construct: "#54d8ff",
  property: "#77a6ff",
  runge: "#ffc96a",
  transfer: "#8b78ff"
};

const EVIDENCE_THEME = {
  result: "#54d8ff",
  process: "#77ffd9",
  explanation: "#ff8fab"
};

const QUADRANT_META = {
  stable: {
    label: "高信心高表现",
    description: "稳定掌握，可承担讲解与带组任务。",
    tone: "#54d8ff"
  },
  underestimated: {
    label: "低信心高表现",
    description: "表现优于自评，适合鼓励表达与站出来讲。",
    tone: "#77ffd9"
  },
  overestimated: {
    label: "高信心低表现",
    description: "需要优先做校准反馈，避免继续高估。",
    tone: "#ff9c6a"
  },
  scaffold: {
    label: "低信心低表现",
    description: "基础待补，建议先给最小例题和低门槛支架。",
    tone: "#ff6b88"
  }
};

const DIMENSION_ADVICE = {
  construct: "建议下一次讲评先回到最小节点例子，重新拆解基函数是怎样同时满足“本节点取 1、其余节点取 0”的。",
  property: "建议回讲插值条件如何由基函数性质推出，并把“唯一性证明链”完整补一遍。",
  runge: "建议优先做“节点分布-端点振荡-误差放大”的图像对比，让学生分清“插值成立”和“逼近稳定”。",
  transfer: "建议补做方法判断题，训练什么时候继续用全局多项式，什么时候应考虑节点优化或分段方法。"
};

const LAGRANGE_PROBLEM_SET = [
  {
    number: "1",
    blocks: [
      "(x_0,y_0)=(-1,0),\\quad (x_1,y_1)=(0,1),\\quad (x_2,y_2)=(1,0),\\quad (x_3,y_3)=(2,3)",
      "P_3(x)=\\underline{\\qquad}"
    ],
    prompt: "求三次插值多项式"
  },
  {
    number: "2",
    blocks: [
      "x_0=-1,\\quad x_1=0,\\quad x_2=2,\\quad x_3=4",
      "L_2(x)=\\underline{\\qquad}",
      "L_2'(2)=\\underline{\\qquad}"
    ],
    prompt: "求"
  },
  {
    number: "3",
    blocks: [
      "x_0=-a,\\quad x_1=0,\\quad x_2=a,\\qquad f(-a)=\\alpha,\\quad f(0)=\\beta,\\quad f(a)=\\gamma,\\qquad a\\neq 0",
      "P_2(x)=\\underline{\\qquad}"
    ],
    prompt: "求二次插值多项式"
  },
  {
    number: "4",
    blocks: [
      "f(x)=x^4,\\qquad x_0=-1,\\quad x_1=0,\\quad x_2=1,\\quad x_3=2",
      "P_3(x)=\\underline{\\qquad}",
      "f(x)-P_3(x)=\\underline{\\qquad}"
    ],
    prompt: "求"
  },
  {
    number: "5",
    blocks: [
      "x_0=-1,\\quad x_1=0,\\quad x_2=2",
      "\\sum_{k=0}^2L_k(x)=\\underline{\\qquad}",
      "\\sum_{k=0}^2x_kL_k(x)=\\underline{\\qquad}",
      "\\sum_{k=0}^2x_k^2L_k(x)=\\underline{\\qquad}"
    ],
    prompt: "求"
  },
  {
    number: "6",
    blocks: [
      "x_0=-1,\\quad x_1=0,\\quad x_2=1,\\quad x_3=2",
      "w_k=\\frac{1}{\\prod\\limits_{j\\ne k}(x_k-x_j)}",
      "(w_0,w_1,w_2,w_3)=\\underline{\\qquad}"
    ],
    prompt: "求"
  },
  {
    number: "9",
    blocks: [
      "\\omega_3(x)=\\prod_{i=0}^{2}(x-x_i)"
    ],
    prompt: "分别求下列情形的最大值",
    subparts: [
      {
        label: "(1)",
        blocks: [
          "x_0=-1,\\quad x_1=0,\\quad x_2=1",
          "\\max_{x\\in[-1,1]}|\\omega_3(x)|=\\underline{\\qquad}"
        ]
      },
      {
        label: "(2)",
        blocks: [
          "x_0=-\\frac{\\sqrt3}{2},\\quad x_1=0,\\quad x_2=\\frac{\\sqrt3}{2}",
          "\\max_{x\\in[-1,1]}|\\omega_3(x)|=\\underline{\\qquad}"
        ]
      }
    ]
  },
  {
    number: "10",
    blocks: [
      "n\\ge 2"
    ],
    prompt: "判断下列命题正确的是",
    options: [
      { label: "A", latex: "\\sum_{k=0}^{n}L_k(x)=1" },
      { label: "B", latex: "\\sum_{k=0}^{n}x_kL_k(x)=x" },
      { label: "C", latex: "\\sum_{k=0}^{n}x_k^2L_k(x)=x^2" },
      { label: "D", latex: "\\sum_{k=0}^{n}x_k^3L_k(x)=x^3" }
    ],
    answerLatex: "\\underline{\\qquad}"
  },
  {
    number: "11",
    blocks: [
      "(x_0,y_0)=(-1,0),\\quad (x_1,y_1)=(0,1),\\quad (x_2,y_2)=(1,0),\\quad (x_3,y_3)=(2,3)",
      "P_3'(0)=\\underline{\\qquad}"
    ],
    prompt: "若对应插值多项式为 \\(P_3(x)\\)，求"
  },
  {
    number: "12",
    blocks: [
      "f(x)=x^4"
    ],
    prompt: "完成下列三问",
    subparts: [
      {
        label: "(1)",
        blocks: [
          "x_0=-1,\\quad x_1=0,\\quad x_2=1",
          "P_2(x)=\\underline{\\qquad}"
        ],
        prompt: "求二次插值多项式"
      },
      {
        label: "(2)",
        blocks: [
          "x_0=-1,\\quad x_1=0,\\quad x_2=1,\\quad x_3=2",
          "P_3(x)=\\underline{\\qquad}"
        ],
        prompt: "求三次插值多项式"
      },
      {
        label: "(3)",
        blocks: [
          "P_3(x)-P_2(x)=\\underline{\\qquad}"
        ],
        prompt: "求"
      }
    ]
  }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundOne(value) {
  return Number(value.toFixed(1));
}

function formatPercent(value) {
  return `${value.toFixed(0)}%`;
}

function formatSigned(value, digits = 1, suffix = "") {
  const fixed = value.toFixed(digits);
  return `${value > 0 ? "+" : value < 0 ? "" : ""}${fixed}${suffix}`;
}

function weightedTotal(items) {
  return items.reduce((sum, item) => sum + (item.qualityWeight || 0), 0);
}

function weightedAverage(items, selector) {
  const total = weightedTotal(items);
  if (total === 0) {
    return 0;
  }

  return roundOne(
    items.reduce((sum, item) => sum + selector(item) * item.qualityWeight, 0) / total
  );
}

function weightedShare(items, predicate) {
  const total = weightedTotal(items);
  if (total === 0) {
    return 0;
  }

  return roundOne(
    (items.reduce((sum, item) => sum + (predicate(item) ? item.qualityWeight : 0), 0) / total) * 100
  );
}

function getQuadrant(student) {
  if (!student.submitted) {
    return "scaffold";
  }

  const highConfidence = student.record.meta.confidenceIndex >= ANALYSIS_THRESHOLD;
  const highPerformance = student.averageDimension >= ANALYSIS_THRESHOLD;

  if (highConfidence && highPerformance) {
    return "stable";
  }

  if (!highConfidence && highPerformance) {
    return "underestimated";
  }

  if (highConfidence && !highPerformance) {
    return "overestimated";
  }

  return "scaffold";
}

function buildGroups(submittedStudents) {
  const mentors = submittedStudents
    .filter(
      (student) =>
        student.diagnosis === "真懂" &&
        (student.record.meta.roles.includes("讲解") || student.record.meta.roles.includes("组织"))
    )
    .sort(
      (a, b) =>
        b.record.evidenceScores.explanationEvidence - a.record.evidenceScores.explanationEvidence
    );

  const foundationQueue = submittedStudents
    .filter((student) => student.diagnosis === "基础待补")
    .sort((a, b) => b.riskScore - a.riskScore);

  const calibrationQueue = submittedStudents
    .filter((student) => student.diagnosis === "校准失衡")
    .sort((a, b) => b.riskScore - a.riskScore);

  const routineQueue = submittedStudents
    .filter((student) => student.diagnosis === "会套" || student.diagnosis === "猜对")
    .sort((a, b) => b.riskScore - a.riskScore);

  const pool = [...foundationQueue, ...routineQueue, ...calibrationQueue];
  const used = new Set();
  const groups = [];

  function takeFrom(queue) {
    const next = queue.find((student) => !used.has(student.id));
    if (!next) {
      return null;
    }
    used.add(next.id);
    return next;
  }

  const groupCount = Math.ceil(submittedStudents.length / 4);

  for (let index = 0; index < groupCount; index += 1) {
    const members = [];
    const mentor = takeFrom(mentors);
    const foundation = takeFrom(foundationQueue);
    const routine = takeFrom(routineQueue);
    const calibration = takeFrom(calibrationQueue);

    if (mentor) members.push(mentor);
    if (foundation) members.push(foundation);
    if (routine) members.push(routine);
    if (calibration) members.push(calibration);

    while (members.length < 4) {
      const extra = pool.find((student) => !used.has(student.id));
      if (!extra) {
        break;
      }
      used.add(extra.id);
      members.push(extra);
    }

    const dimensionCounts = members.reduce((accumulator, member) => {
      if (member.weakestDimensionKey) {
        accumulator[member.weakestDimensionKey] =
          (accumulator[member.weakestDimensionKey] || 0) + 1;
      }
      return accumulator;
    }, {});

    const focusKey =
      Object.entries(dimensionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "construct";

    groups.push({
      id: `G${index + 1}`,
      label: `第 ${index + 1} 组`,
      focusKey,
      focusLabel: dimensionLabels[focusKey],
      mentor: mentor ? mentor.name : "待补位",
      members
    });
  }

  return groups;
}

function buildStatisticsExportRows(students) {
  return students.map((student) => {
    if (!student.submitted) {
      return {
        姓名: student.name,
        学号: student.studentId,
        提交状态: "未提交",
        诊断标签: "",
        平均维度分: "",
        最弱维度: "",
        信心表现差值: "",
        数据质量: "",
        用时: "",
        提示点击: "",
        节点验证点击: "",
        误差对比点击: "",
        教师建议动作: "优先催交并补采集完整证据"
      };
    }

    return {
      姓名: student.name,
      学号: student.studentId,
      提交状态: "已提交",
      诊断标签: student.diagnosis,
      平均维度分: student.averageDimension.toFixed(1),
      最弱维度: student.weakestDimensionLabel,
      信心表现差值: student.confidenceGap.toFixed(1),
      数据质量: `${student.qualityBand} / ${student.record.quality.score}`,
      用时: student.record.elapsedLabel,
      提示点击: String(student.record.behavior.hintClicks),
      节点验证点击: String(student.record.behavior.verifyClicks),
      误差对比点击: String(student.record.behavior.compareClicks),
      教师建议动作: student.record.teacherAction
    };
  });
}

function buildGroupExportRows(groups) {
  return groups.map((group) => ({
    分组: group.label,
    讲解锚点: group.mentor,
    小组焦点: group.focusLabel,
    成员名单: group.members.map((member) => `${member.name}（${member.diagnosis}）`).join("、")
  }));
}

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
}

function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildDashboardView(students) {
  const submittedStudents = students.filter((student) => student.submitted);
  const submittedCount = submittedStudents.length;
  const submissionRate = roundOne((submittedCount / students.length) * 100);
  const totalWeight = weightedTotal(submittedStudents);
  const averageDimension = weightedAverage(submittedStudents, (student) => student.averageDimension);
  const highQualityCount = submittedStudents.filter((student) => student.qualityBand === "高质量").length;
  const highQualityShare = roundOne((highQualityCount / submittedStudents.length) * 100);

  const dimensionStats = Object.entries(dimensionLabels).map(([key, label]) => {
    const average = weightedAverage(submittedStudents, (student) => student.record.dimensionScores[key]);
    const lowShare = weightedShare(
      submittedStudents,
      (student) => student.record.dimensionScores[key] < ANALYSIS_THRESHOLD
    );
    const lowCount = submittedStudents.filter(
      (student) => student.record.dimensionScores[key] < ANALYSIS_THRESHOLD
    ).length;

    return {
      key,
      label,
      average,
      lowShare,
      lowCount,
      color: DIMENSION_THEME[key]
    };
  });

  const weakestDimension = [...dimensionStats].sort((a, b) => a.average - b.average)[0];

  const diagnosisStats = Object.entries(diagnosisMeta).map(([label, meta]) => {
    const studentsInDiagnosis = submittedStudents.filter((student) => student.diagnosis === label);
    const weightedCount = studentsInDiagnosis.reduce(
      (sum, student) => sum + student.qualityWeight,
      0
    );

    return {
      label,
      meta,
      rawCount: studentsInDiagnosis.length,
      weightedCount,
      weightedShare: totalWeight ? roundOne((weightedCount / totalWeight) * 100) : 0
    };
  });

  const dominantDiagnosis = [...diagnosisStats].sort((a, b) => b.rawCount - a.rawCount)[0];
  const foundationCount = diagnosisStats.find((item) => item.label === "基础待补")?.rawCount || 0;
  const calibrationCount = diagnosisStats.find((item) => item.label === "校准失衡")?.rawCount || 0;

  const evidenceStats = [
    {
      key: "result",
      label: "结果证据",
      value: weightedAverage(
        submittedStudents,
        (student) => student.record.evidenceScores.resultEvidence
      ),
      color: EVIDENCE_THEME.result,
      caption: "做对了多少"
    },
    {
      key: "process",
      label: "过程证据",
      value: weightedAverage(
        submittedStudents,
        (student) => student.record.evidenceScores.processEvidence
      ),
      color: EVIDENCE_THEME.process,
      caption: "做题过程是否有痕迹"
    },
    {
      key: "explanation",
      label: "解释证据",
      value: weightedAverage(
        submittedStudents,
        (student) => student.record.evidenceScores.explanationEvidence
      ),
      color: EVIDENCE_THEME.explanation,
      caption: "能不能把原因讲明白"
    }
  ];

  const resultValue = evidenceStats.find((item) => item.key === "result")?.value || 0;
  const processValue = evidenceStats.find((item) => item.key === "process")?.value || 0;
  const explanationValue = evidenceStats.find((item) => item.key === "explanation")?.value || 0;

  const evidenceSignals = [];
  if (resultValue - explanationValue >= 1.4) {
    evidenceSignals.push(
      `结果证据明显高于解释证据 ${formatSigned(resultValue - explanationValue)}，班级里“会做不会讲”的比例偏高。`
    );
  }
  if (resultValue - processValue >= 1.1) {
    evidenceSignals.push(
      `结果证据高于过程证据 ${formatSigned(resultValue - processValue)}，存在套模板或凭表面特征作答的风险。`
    );
  }
  if (processValue - resultValue >= 0.8) {
    evidenceSignals.push("过程证据高于结果证据，说明部分学生思路已有，但收束和落地还弱。");
  }
  if (evidenceSignals.length === 0) {
    evidenceSignals.push("三类证据整体差距不大，本次班级表现相对均衡。");
  }

  const scatterPoints = submittedStudents.map((student) => ({
    id: student.id,
    label: student.avatarLabel,
    name: student.name,
    x: student.record.meta.confidenceIndex,
    y: student.averageDimension,
    diagnosis: student.diagnosis,
    quadrant: getQuadrant(student)
  }));

  const quadrantStats = Object.entries(QUADRANT_META).map(([key, meta]) => ({
    key,
    ...meta,
    count: scatterPoints.filter((point) => point.quadrant === key).length
  }));

  const topRiskStudents = [...students].sort((a, b) => b.riskScore - a.riskScore);
  const unsubmittedCount = students.length - submittedCount;
  const downWeightedCount = submittedStudents.filter((student) => student.qualityWeight < 1).length;
  const mentorCandidates = submittedStudents
    .filter(
      (student) =>
        student.diagnosis === "真懂" &&
        (student.record.meta.roles.includes("讲解") || student.record.meta.roles.includes("组织"))
    )
    .slice(0, 5);
  const supportStudents = topRiskStudents
    .filter((student) => student.submitted && student.riskScore >= 75)
    .slice(0, 5);

  const groups = buildGroups(submittedStudents);

  const overviewCards = [
    {
      id: "submission",
      label: "班级提交率",
      value: submissionRate,
      suffix: "%",
      decimals: 0,
      accent: "#54d8ff",
      sparkline: [74, 79, 81, 84, submissionRate],
      delta: `较上次 ${formatSigned(submissionRate - 84, 0, "%")}`,
      note: `${unsubmittedCount} 人仍未提交，名单区已按风险优先排序。`
    },
    {
      id: "dimension",
      label: "平均维度分",
      value: averageDimension,
      suffix: " / 10",
      decimals: 1,
      accent: "#77ffd9",
      sparkline: [6.1, 6.3, 6.4, 6.5, averageDimension],
      delta: `较上次 ${formatSigned(averageDimension - 6.5)}`,
      note: `班级整体处在 ${averageDimension >= 7 ? "可讲评提升" : "仍需稳基础"} 区间。`
    },
    {
      id: "weakest",
      label: "当前最薄弱维度",
      textValue: weakestDimension.label,
      subvalue: `${weakestDimension.average.toFixed(1)} / 10`,
      accent: weakestDimension.color,
      sparkline: [5.2, 5.4, 5.6, 5.5, weakestDimension.average],
      delta: `阈下 ${formatPercent(weakestDimension.lowShare)}`,
      note: `${weakestDimension.lowCount} 人在该维度低于 ${ANALYSIS_THRESHOLD} 分。`
    },
    {
      id: "foundation",
      label: "基础待补人数",
      value: foundationCount,
      suffix: " 人",
      decimals: 0,
      accent: "#ff6b88",
      sparkline: [11, 10, 9, 8, foundationCount],
      delta: `较上次 ${formatSigned(foundationCount - 8, 0, " 人")}`,
      note: "建议在讲评前单独标记高焦虑学生，避免直接拉到高强度讨论。"
    },
    {
      id: "calibration",
      label: "校准失衡人数",
      value: calibrationCount,
      suffix: " 人",
      decimals: 0,
      accent: "#ff9c6a",
      sparkline: [5, 4, 4, 3, calibrationCount],
      delta: `较上次 ${formatSigned(calibrationCount - 3, 0, " 人")}`,
      note: "这类学生需要先对齐自评和真实表现，再回补知识点。"
    },
    {
      id: "quality",
      label: "高质量数据占比",
      value: highQualityShare,
      suffix: "%",
      decimals: 0,
      accent: "#65e1c7",
      sparkline: [68, 72, 74, 78, highQualityShare],
      delta: `较上次 ${formatSigned(highQualityShare - 78, 0, "%")}`,
      note: `${downWeightedCount} 份记录已被降权，但仍保留在全班分析里。`
    }
  ];

  const filterOptions = {
    diagnosis: ["全部", "未提交", ...Object.keys(diagnosisMeta)],
    weakest: ["全部", ...Object.entries(dimensionLabels).map(([key, label]) => `${key}::${label}`)],
    quality: ["全部", "待采集", ...Object.keys(qualityMeta)],
    support: ["全部", ...new Set(submittedStudents.map((student) => student.supportNeed))],
    collaboration: [
      "全部",
      ...new Set(submittedStudents.map((student) => student.collaborationMode))
    ]
  };

  return {
    students,
    submittedStudents,
    groups,
    overviewCards,
    submissionRate,
    averageDimension,
    weakestDimension,
    diagnosisStats,
    dominantDiagnosis,
    evidenceStats,
    evidenceSignals,
    scatterPoints,
    quadrantStats,
    dimensionStats,
    topRiskStudents,
    unsubmittedCount,
    supportStudents,
    mentorCandidates,
    downWeightedCount,
    highQualityShare,
    foundationCount,
    calibrationCount,
    filterOptions,
    suggestionCards: [
      {
        title: "课后讲评建议",
        lines: [
          `${weakestDimension.label} 是当前最薄弱维度，${DIMENSION_ADVICE[weakestDimension.key]}`,
          `${dominantDiagnosis.label} 占比最高，说明本次讲评不能只报平均分，要直接用标签语言组织反馈。`,
          evidenceSignals[0]
        ]
      },
      {
        title: "分组建议",
        lines: [
          `优先用 ${mentorCandidates.map((student) => student.name).slice(0, 3).join("、")} 作为讲解锚点，负责讲清“为什么”。`,
          "将“会套 / 猜对”与“真懂”混合分组，让会做但不会讲的学生在解释链条上被拉起来。",
          `“基础待补 + 高焦虑”建议先放入低强度支架组，优先处理 ${weakestDimension.label}。`
        ]
      },
      {
        title: "个别关注建议",
        lines: [
          `优先关注 ${supportStudents.map((student) => student.name).slice(0, 4).join("、")} 这批高风险学生。`,
          `${quadrantStats.find((item) => item.key === "overestimated")?.count || 0} 人落在“高信心低表现”象限，适合先做校准反馈。`,
          `${quadrantStats.find((item) => item.key === "underestimated")?.count || 0} 人表现好于自评，可鼓励他们承担表达与讲解角色。`
        ]
      },
      {
        title: "数据使用建议",
        lines: [
          `${downWeightedCount} 份低质量或边缘质量数据没有被删除，而是自动降权处理，避免误删弱势学生信号。`,
          "在班级均值、标签占比和风险排序中都已纳入质量权重；个别高风险判断仍建议结合课堂观察复核。",
          "未提交数据不纳入均值，但会留在风险清单里，避免催交环节被遗漏。"
        ]
      }
    ],
    statisticsRows: buildStatisticsExportRows(students),
    groupingRows: buildGroupExportRows(groups)
  };
}

function Sparkline({ points, color }) {
  const width = 126;
  const height = 42;
  const padding = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, 1);
  const path = points
    .map((point, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((point - min) / span) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="teacher-sparkline" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function AnimatedNumber({ value, decimals = 0, suffix = "", prefix = "" }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 880;
    const start = performance.now();

    function tick(now) {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function Badge({ label, color, glow }) {
  return (
    <span className="teacher-badge" style={{ "--badge-color": color, "--badge-glow": glow }}>
      {label}
    </span>
  );
}

function ProblemCard({ problem }) {
  return (
    <article className="teacher-panel teacher-problem-card">
      <div className="teacher-problem-head">
        <span className="teacher-problem-number">题 {problem.number}</span>
        <strong>
          <InlineMathText text={problem.prompt} />
        </strong>
      </div>

      <div className="teacher-problem-body">
        {problem.blocks?.map((latex, index) => (
          <MathFormula key={`${problem.number}-block-${index}`} latex={latex} />
        ))}

        {problem.options ? (
          <div className="teacher-problem-options">
            {problem.options.map((option) => (
              <div key={`${problem.number}-${option.label}`} className="teacher-problem-option">
                <span>{option.label}.</span>
                <MathFormula latex={option.latex} />
              </div>
            ))}
            <div className="teacher-problem-answer">
              <span>正确选项为：</span>
              <MathFormula latex={problem.answerLatex} />
            </div>
          </div>
        ) : null}

        {problem.subparts ? (
          <div className="teacher-problem-subparts">
            {problem.subparts.map((subpart) => (
              <div key={`${problem.number}-${subpart.label}`} className="teacher-problem-subpart">
                <div className="teacher-problem-subhead">
                  <span>{subpart.label}</span>
                  <strong>
                    <InlineMathText text={subpart.prompt || "求"} />
                  </strong>
                </div>
                {subpart.blocks.map((latex, index) => (
                  <MathFormula key={`${problem.number}-${subpart.label}-${index}`} latex={latex} />
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SectionTitle({ eyebrow, title, description, extra }) {
  return (
    <div className="teacher-section-head">
      <div>
        {eyebrow ? <p className="teacher-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {extra ? <div className="teacher-section-extra">{extra}</div> : null}
    </div>
  );
}

function DonutChart({ items, activeLabel, onChange }) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const total = items.reduce((sum, item) => sum + item.weightedCount, 0) || 1;
  let offset = 0;

  return (
    <div className="teacher-donut-wrap">
      <svg viewBox="0 0 200 200" className="teacher-donut" aria-hidden="true">
        <circle cx="100" cy="100" r={radius} className="teacher-donut-track" />
        {items.map((item) => {
          const dash = (item.weightedCount / total) * circumference;
          const circle = (
            <circle
              key={item.label}
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={item.meta.color}
              strokeWidth={20}
              strokeDasharray={`${Math.max(dash - 4, 0)} ${circumference}`}
              strokeDashoffset={-offset}
              className={activeLabel === item.label ? "teacher-donut-segment is-active" : "teacher-donut-segment"}
              onMouseEnter={() => onChange(item.label)}
            />
          );
          offset += dash;
          return circle;
        })}
        <g transform="translate(100 100)" className="teacher-donut-center">
          <text textAnchor="middle" y="-2" className="teacher-donut-count">
            {items.reduce((sum, item) => sum + item.rawCount, 0)}
          </text>
          <text textAnchor="middle" y="18" className="teacher-donut-label">
            已提交人数
          </text>
        </g>
      </svg>

      <div className="teacher-donut-legend">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={activeLabel === item.label ? "teacher-legend-item is-active" : "teacher-legend-item"}
            onMouseEnter={() => onChange(item.label)}
            onClick={() => onChange(item.label)}
          >
            <span className="teacher-legend-swatch" style={{ backgroundColor: item.meta.color }} />
            <span className="teacher-legend-main">
              <strong>{item.label}</strong>
              <small>{item.rawCount} 人</small>
            </span>
            <span className="teacher-legend-share">{item.weightedShare.toFixed(0)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function buildPointPosition(value, min, max, size) {
  return ((value - min) / (max - min)) * size;
}

export function TeacherFeedbackDashboard() {
  const [currentStudents, setCurrentStudents] = useState(() => getStoredLagrangeDashboardStudents());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const students = currentStudents;
  const dashboard = useMemo(() => buildDashboardView(students), [students]);
  const [activeDiagnosis, setActiveDiagnosis] = useState(dashboard.dominantDiagnosis.label);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [filters, setFilters] = useState({
    diagnosis: "全部",
    weakest: "全部",
    quality: "全部",
    anxiety: "全部",
    support: "全部",
    collaboration: "全部"
  });

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setSelectedStudentId(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const filteredStudents = useMemo(() => {
    return [...dashboard.students]
      .filter((student) => {
        if (filters.diagnosis !== "全部" && student.diagnosis !== filters.diagnosis) {
          return false;
        }

        if (filters.weakest !== "全部") {
          const [key] = filters.weakest.split("::");
          if (student.weakestDimensionKey !== key) {
            return false;
          }
        }

        if (filters.quality !== "全部" && student.qualityBand !== filters.quality) {
          return false;
        }

        if (filters.anxiety !== "全部") {
          if (student.anxietyScore == null) {
            return false;
          }
          if (filters.anxiety === "高焦虑" && student.anxietyScore < 4) {
            return false;
          }
          if (filters.anxiety === "中等焦虑" && student.anxietyScore !== 3) {
            return false;
          }
          if (filters.anxiety === "低焦虑" && student.anxietyScore > 2) {
            return false;
          }
        }

        if (filters.support !== "全部" && student.supportNeed !== filters.support) {
          return false;
        }

        if (filters.collaboration !== "全部" && student.collaborationMode !== filters.collaboration) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [dashboard.students, filters]);

  const selectedStudent = useMemo(
    () => dashboard.students.find((student) => student.id === selectedStudentId) || null,
    [dashboard.students, selectedStudentId]
  );

  const highRiskFilteredCount = filteredStudents.filter((student) => student.riskScore >= 80).length;
  const filteredUnsubmittedCount = filteredStudents.filter((student) => !student.submitted).length;
  const activeDiagnosisDetail = diagnosisMeta[activeDiagnosis] || diagnosisMeta.基础待补;

  return (
    <div className="teacher-dashboard">
      <div className="teacher-dashboard-orb teacher-dashboard-orb-a" />
      <div className="teacher-dashboard-orb teacher-dashboard-orb-b" />
      <div className="teacher-dashboard-gridline" />

      <div className="teacher-dashboard-shell">
        <header className="teacher-hero">
          <div className="teacher-hero-copy">
            <p className="teacher-eyebrow">{COURSE_LABEL}</p>
            <h1>{SYSTEM_TITLE}</h1>
            <div className="teacher-hero-meta-line">
              <span className="teacher-hero-pill">{CLASS_NAME}</span>
              <span className="teacher-hero-pill">{dashboard.students.length} 人</span>
              <button 
                type="button" 
                className="teacher-hero-pill"
                onClick={() => setIsModalOpen(true)}
                style={{ 
                  background: '#10a37f', 
                  color: 'white', 
                  cursor: 'pointer',
                  border: 'none',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(16, 163, 127, 0.3)',
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  borderRadius: '12px'
                }}
              >
                🛠️ 管理本页学情数据
              </button>
            </div>
          </div>

          <div className="teacher-hero-side">
            <div className="teacher-hero-card">
              <span>当前短板</span>
              <strong>{dashboard.weakestDimension.label}</strong>
              <small>{dashboard.weakestDimension.average.toFixed(1)} / 10</small>
            </div>
            <nav className="teacher-anchor-nav">
              <a href="#overview">总览</a>
              <a href="#students">名单</a>
              <a href="#problems">题目</a>
              <a href="#advice">建议</a>
            </nav>
          </div>
        </header>

        <section id="overview" className="teacher-section">
          <SectionTitle
            title="班级总览与分析主面板"
          />

          <div className="teacher-metric-grid">
            {dashboard.overviewCards.map((card) => (
              <article key={card.id} className="teacher-panel teacher-metric-card" style={{ "--metric-accent": card.accent }}>
                <div className="teacher-metric-head">
                  <span>{card.label}</span>
                  <Sparkline points={card.sparkline} color={card.accent} />
                </div>
                <div className="teacher-metric-value">
                  {card.textValue ? (
                    <div>
                      <strong>{card.textValue}</strong>
                      <small>{card.subvalue}</small>
                    </div>
                  ) : (
                    <strong>
                      <AnimatedNumber
                        value={card.value}
                        decimals={card.decimals}
                        suffix={card.suffix}
                      />
                    </strong>
                  )}
                </div>
                <div className="teacher-metric-delta">{card.delta}</div>
                <p>{card.note}</p>
              </article>
            ))}
          </div>

          <div className="teacher-analysis-grid">
            <article className="teacher-panel teacher-span-7">
              <div className="teacher-panel-head">
                <div>
                  <h3>四个核心维度的班级均值</h3>
                  <p>横条展示加权均值，右侧同步标出低于 {ANALYSIS_THRESHOLD} 分的学生占比。</p>
                </div>
                <Badge
                  label={`最弱：${dashboard.weakestDimension.label}`}
                  color={dashboard.weakestDimension.color}
                  glow="rgba(84, 216, 255, 0.12)"
                />
              </div>

              <div className="teacher-dimension-list">
                {dashboard.dimensionStats.map((item) => (
                  <div
                    key={item.key}
                    className={
                      dashboard.weakestDimension.key === item.key
                        ? "teacher-dimension-row is-weakest"
                        : "teacher-dimension-row"
                    }
                  >
                    <div className="teacher-dimension-head">
                      <div>
                        <strong>{item.label}</strong>
                        <span>加权均值 {item.average.toFixed(1)} / 10</span>
                      </div>
                      <div className="teacher-dimension-side">
                        <span>阈下 {item.lowShare.toFixed(0)}%</span>
                        <span>{item.lowCount} 人</span>
                      </div>
                    </div>
                    <div className="teacher-dimension-track">
                      <div
                        className="teacher-dimension-fill"
                        style={{ width: `${item.average * 10}%`, "--fill-color": item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="teacher-panel teacher-span-5">
              <div className="teacher-panel-head">
                <div>
                  <h3>诊断标签分布</h3>
                  <p>标签比裸分更接近教师决策语言。悬停某一类可同步看到对应的教学动作。</p>
                </div>
                <Badge
                  label={`最高频：${dashboard.dominantDiagnosis.label}`}
                  color={dashboard.dominantDiagnosis.meta.color}
                  glow={dashboard.dominantDiagnosis.meta.glow}
                />
              </div>

              <DonutChart
                items={dashboard.diagnosisStats}
                activeLabel={activeDiagnosis}
                onChange={setActiveDiagnosis}
              />

              <div className="teacher-diagnosis-detail">
                <strong>{activeDiagnosis}</strong>
                <p>{activeDiagnosisDetail.description}</p>
                <small>{activeDiagnosisDetail.action}</small>
              </div>
            </article>

            <article className="teacher-panel teacher-span-5">
              <div className="teacher-panel-head">
                <div>
                  <h3>三类证据对比</h3>
                  <p>重点不是做对多少，而是结果、过程、解释之间有没有失衡。</p>
                </div>
                <Badge label="结果 / 过程 / 解释" color="#77ffd9" glow="rgba(119,255,217,0.22)" />
              </div>

              <div className="teacher-evidence-columns">
                {dashboard.evidenceStats.map((item) => (
                  <div key={item.key} className="teacher-evidence-column">
                    <div className="teacher-evidence-bar">
                      <div
                        className="teacher-evidence-fill"
                        style={{
                          height: `${item.value * 10}%`,
                          "--evidence-color": item.color
                        }}
                      />
                    </div>
                    <strong>{item.value.toFixed(1)}</strong>
                    <span>{item.label}</span>
                    <small>{item.caption}</small>
                  </div>
                ))}
              </div>

              <div className="teacher-signal-list">
                {dashboard.evidenceSignals.map((signal) => (
                  <div key={signal} className="teacher-signal-item">
                    {signal}
                  </div>
                ))}
              </div>
            </article>

            <article className="teacher-panel teacher-span-7">
              <div className="teacher-panel-head">
                <div>
                  <h3>信心 vs 实际表现</h3>
                  <p>横轴是“学习信心 + 新题切入自评”，纵轴是加权后的平均维度分。点击点位可直接打开学生详情。</p>
                </div>
                <Badge label="点击点位查看详情" color="#8b78ff" glow="rgba(139,120,255,0.22)" />
              </div>

              <div className="teacher-scatter-wrap">
                <svg viewBox="0 0 620 360" className="teacher-scatter">
                  <rect x="50" y="34" width="260" height="130" fill="rgba(255, 156, 106, 0.08)" />
                  <rect x="310" y="34" width="260" height="130" fill="rgba(84, 216, 255, 0.08)" />
                  <rect x="50" y="164" width="260" height="150" fill="rgba(255, 107, 136, 0.08)" />
                  <rect x="310" y="164" width="260" height="150" fill="rgba(119, 255, 217, 0.08)" />

                  <line x1="310" y1="34" x2="310" y2="314" className="teacher-scatter-axis teacher-scatter-threshold" />
                  <line x1="50" y1="164" x2="570" y2="164" className="teacher-scatter-axis teacher-scatter-threshold" />
                  <line x1="50" y1="314" x2="570" y2="314" className="teacher-scatter-axis" />
                  <line x1="50" y1="34" x2="50" y2="314" className="teacher-scatter-axis" />

                  <text x="15" y="38" className="teacher-scatter-label teacher-scatter-label-y">
                    平均维度分
                  </text>
                  <text x="500" y="346" className="teacher-scatter-label">
                    自评信心 / 新题切入
                  </text>

                  {dashboard.scatterPoints.map((point) => {
                    const x = 50 + buildPointPosition(point.x, 0, 10, 520);
                    const y = 314 - buildPointPosition(point.y, 0, 10, 280);
                    const color = diagnosisMeta[point.diagnosis]?.color || "#9fb3d9";
                    const active = selectedStudentId === point.id;

                    return (
                      <g
                        key={point.id}
                        className={active ? "teacher-scatter-point is-active" : "teacher-scatter-point"}
                        onClick={() => setSelectedStudentId(point.id)}
                      >
                        <circle cx={x} cy={y} r={active ? 13 : 11} fill={color} />
                        <text x={x} y={y + 4} textAnchor="middle">
                          {point.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="teacher-quadrant-list">
                  {dashboard.quadrantStats.map((item) => (
                    <div key={item.key} className="teacher-quadrant-card" style={{ "--quad-color": item.tone }}>
                      <strong>{item.label}</strong>
                      <span>{item.count} 人</span>
                      <small>{item.description}</small>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="students" className="teacher-section">
          <SectionTitle
            title="学生名单、筛选与风险排序"
            description="表格按风险优先排序，方便老师快速找到“基础待补 + 高焦虑”“高信心低表现”“未提交”等需要立即干预的对象。"
            extra={
              <div className="teacher-filter-summary">
                <div>
                  <strong>{filteredStudents.length}</strong>
                  <span>筛选结果</span>
                </div>
                <div>
                  <strong>{highRiskFilteredCount}</strong>
                  <span>高风险</span>
                </div>
                <div>
                  <strong>{filteredUnsubmittedCount}</strong>
                  <span>未提交</span>
                </div>
              </div>
            }
          />

          <div className="teacher-panel teacher-filter-panel">
            <div className="teacher-filter-grid">
              <label className="teacher-filter-control">
                <span>诊断标签</span>
                <select
                  value={filters.diagnosis}
                  onChange={(event) => setFilters((current) => ({ ...current, diagnosis: event.target.value }))}
                >
                  {dashboard.filterOptions.diagnosis.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="teacher-filter-control">
                <span>最弱维度</span>
                <select
                  value={filters.weakest}
                  onChange={(event) => setFilters((current) => ({ ...current, weakest: event.target.value }))}
                >
                  {dashboard.filterOptions.weakest.map((option) => {
                    const [, label] = option.split("::");
                    return (
                      <option key={option} value={option}>
                        {option === "全部" ? option : label}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="teacher-filter-control">
                <span>数据质量</span>
                <select
                  value={filters.quality}
                  onChange={(event) => setFilters((current) => ({ ...current, quality: event.target.value }))}
                >
                  {dashboard.filterOptions.quality.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="teacher-filter-control">
                <span>焦虑感</span>
                <select
                  value={filters.anxiety}
                  onChange={(event) => setFilters((current) => ({ ...current, anxiety: event.target.value }))}
                >
                  {["全部", "高焦虑", "中等焦虑", "低焦虑"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="teacher-filter-control">
                <span>支架需求</span>
                <select
                  value={filters.support}
                  onChange={(event) => setFilters((current) => ({ ...current, support: event.target.value }))}
                >
                  {dashboard.filterOptions.support.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="teacher-filter-control">
                <span>合作偏好</span>
                <select
                  value={filters.collaboration}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, collaboration: event.target.value }))
                  }
                >
                  {dashboard.filterOptions.collaboration.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="teacher-panel teacher-table-panel">
            <div className="teacher-table-wrap">
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>风险</th>
                    <th>姓名 / 学号</th>
                    <th>提交</th>
                    <th>诊断标签</th>
                    <th>平均维度分</th>
                    <th>最弱维度</th>
                    <th>信心-表现差值</th>
                    <th>数据质量</th>
                    <th>用时</th>
                    <th>提示点击</th>
                    <th>教师建议动作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const diagnosis = diagnosisMeta[student.diagnosis];
                    const quality = qualityMeta[student.qualityBand];
                    const isActive = student.id === selectedStudentId;
                    return (
                      <tr
                        key={student.id}
                        className={isActive ? "is-active" : ""}
                        onClick={() => setSelectedStudentId(student.id)}
                      >
                        <td data-label="风险">
                          <div className="teacher-risk-cell">
                            <span
                              className={`teacher-risk-dot risk-${student.riskBand}`}
                            />
                            <strong>{student.riskScore}</strong>
                          </div>
                        </td>
                        <td data-label="姓名 / 学号">
                          <div className="teacher-student-cell">
                            <strong>{student.name}</strong>
                            <span>{student.studentId}</span>
                          </div>
                        </td>
                        <td data-label="提交">{student.submissionStatusLabel}</td>
                        <td data-label="诊断标签">
                          {diagnosis ? (
                            <Badge label={student.diagnosis} color={diagnosis.color} glow={diagnosis.glow} />
                          ) : (
                            <span className="teacher-muted">待采集</span>
                          )}
                        </td>
                        <td data-label="平均维度分">
                          {student.averageDimension != null ? student.averageDimension.toFixed(1) : "—"}
                        </td>
                        <td data-label="最弱维度">{student.weakestDimensionLabel}</td>
                        <td data-label="信心-表现差值">
                          {student.confidenceGap != null ? (
                            <span className={student.confidenceGap > 1 ? "teacher-gap is-positive" : student.confidenceGap < -1 ? "teacher-gap is-negative" : "teacher-gap"}>
                              {formatSigned(student.confidenceGap)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td data-label="数据质量">
                          {quality ? (
                            <Badge label={student.qualityBand} color={quality.color} glow={quality.glow} />
                          ) : (
                            <span className="teacher-muted">{student.qualityBand}</span>
                          )}
                        </td>
                        <td data-label="用时">{student.submitted ? student.record.elapsedLabel : "—"}</td>
                        <td data-label="提示点击">
                          {student.submitted ? `${student.record.behavior.hintClicks} 次` : "—"}
                        </td>
                        <td data-label="教师建议动作">
                          <div className="teacher-action-cell">{student.teacherActionShort}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="problems" className="teacher-section">
          <SectionTitle
            title="课后讲评题目清单"
            description="以下仅保留题目，不显示答案，可直接用于教师讲评、板书推导或二次练习安排。"
          />

          <div className="teacher-problem-grid">
            {LAGRANGE_PROBLEM_SET.map((problem) => (
              <ProblemCard key={problem.number} problem={problem} />
            ))}
          </div>
        </section>

        <section id="advice" className="teacher-section">
          <SectionTitle
            title="教学动作建议与导出"
            description="建议区直接对应课后讲评、分组组织、个别关注和数据使用四类教师动作，同时保留导出统计表与分组名单。"
            extra={
              <div className="teacher-export-actions">
                <button
                  type="button"
                  className="teacher-export-button"
                  onClick={() =>
                    downloadCsv(`${CLASS_NAME}-${SYSTEM_TITLE}-统计表.csv`, dashboard.statisticsRows)
                  }
                >
                  导出统计表
                </button>
                <button
                  type="button"
                  className="teacher-export-button is-secondary"
                  onClick={() =>
                    downloadCsv(`${CLASS_NAME}-${SYSTEM_TITLE}-分组建议名单.csv`, dashboard.groupingRows)
                  }
                >
                  导出分组名单
                </button>
              </div>
            }
          />

          <div className="teacher-suggestion-grid">
            {dashboard.suggestionCards.map((card) => (
              <article key={card.title} className="teacher-panel teacher-suggestion-card">
                <h3>{card.title}</h3>
                <ul>
                  {card.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="teacher-panel teacher-group-preview">
            <div className="teacher-panel-head">
              <div>
                <h3>推荐分组预览</h3>
                <p>每组优先配置 1 名讲解锚点，再混入“会套 / 猜对 / 基础待补 / 校准失衡”不同类型学生。</p>
              </div>
              <Badge label={`${dashboard.groups.length} 组`} color="#54d8ff" glow="rgba(84,216,255,0.22)" />
            </div>

            <div className="teacher-group-grid">
              {dashboard.groups.map((group) => (
                <div key={group.id} className="teacher-group-card">
                  <div className="teacher-group-head">
                    <strong>{group.label}</strong>
                    <span>焦点：{group.focusLabel}</span>
                  </div>
                  <div className="teacher-group-members">
                    {group.members.map((member) => (
                      <span key={member.id}>
                        {member.name} · {member.diagnosis}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {selectedStudent ? (
        <div className="teacher-drawer-backdrop" onClick={() => setSelectedStudentId(null)}>
          <aside className="teacher-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="teacher-drawer-head">
              <div>
                <p className="teacher-eyebrow">学生详情</p>
                <h3>{selectedStudent.name}</h3>
                <p>{selectedStudent.studentId}</p>
              </div>
              <button type="button" className="teacher-drawer-close" onClick={() => setSelectedStudentId(null)}>
                关闭
              </button>
            </div>

            {selectedStudent.submitted ? (
              <>
                <div className="teacher-drawer-summary">
                  <div className="teacher-drawer-stat">
                    <span>诊断标签</span>
                    <strong>{selectedStudent.diagnosis}</strong>
                  </div>
                  <div className="teacher-drawer-stat">
                    <span>平均维度分</span>
                    <strong>{selectedStudent.averageDimension.toFixed(1)}</strong>
                  </div>
                  <div className="teacher-drawer-stat">
                    <span>数据质量</span>
                    <strong>{selectedStudent.qualityBand}</strong>
                  </div>
                  <div className="teacher-drawer-stat">
                    <span>风险排序</span>
                    <strong>{selectedStudent.riskScore}</strong>
                  </div>
                </div>

                <div className="teacher-drawer-grid">
                  <section className="teacher-drawer-section">
                    <h4>A. 学生原始填写</h4>
                    <div className="teacher-drawer-list">
                      {selectedStudent.record.directData.map((item) => (
                        <div key={item.label} className="teacher-info-row">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="teacher-text-block">
                      <span>节点性质解释</span>
                      <p>{selectedStudent.record.meta.textResponses.reason || "未填写"}</p>
                    </div>
                    <div className="teacher-text-block">
                      <span>给同伴的提醒</span>
                      <p>{selectedStudent.record.meta.textResponses.tip || "未填写"}</p>
                    </div>
                  </section>

                  <section className="teacher-drawer-section">
                    <h4>B. 系统行为记录</h4>
                    <div className="teacher-drawer-list">
                      {selectedStudent.record.behaviorData.map((item) => (
                        <div key={item.label} className="teacher-info-row">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                      {selectedStudent.record.practiceResults.map((item) => (
                        <div key={item.id} className="teacher-info-row">
                          <span>{item.label}</span>
                          <strong>
                            {item.score.toFixed(1)} · {item.errorType}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="teacher-drawer-section">
                    <h4>C. 教学分析结果</h4>
                    <div className="teacher-drawer-list">
                      {selectedStudent.record.derivedData.map((item) => (
                        <div key={item.label} className="teacher-info-row">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                      <div className="teacher-info-row">
                        <span>当前最强维度</span>
                        <strong>{selectedStudent.strongestDimensionLabel}</strong>
                      </div>
                      <div className="teacher-info-row">
                        <span>当前最弱维度</span>
                        <strong>{selectedStudent.weakestDimensionLabel}</strong>
                      </div>
                    </div>

                    <div className="teacher-action-note">
                      <span>教师建议动作</span>
                      <p>{selectedStudent.record.teacherAction}</p>
                    </div>

                    {selectedStudent.record.quality.flags.length ? (
                      <div className="teacher-flag-list">
                        {selectedStudent.record.quality.flags.map((flag) => (
                          <span key={flag}>{flag}</span>
                        ))}
                      </div>
                    ) : null}
                  </section>
                </div>
              </>
            ) : (
              <div className="teacher-empty-drawer">
                <strong>该生尚未提交课后反馈</strong>
                <p>当前不纳入班级均值和标签统计。建议先催交，再补做四题诊断与解释证据采集。</p>
              </div>
            )}
          </aside>
        </div>
      ) : null}
      {/* Data Management Modal */}
      <DataManagementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataChanged={(newList) => {
          setCurrentStudents(newList);
          setSelectedStudentId(null);
        }}
        mode="teacher-dashboard"
      />
    </div>
  );
}
