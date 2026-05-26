/**
 * 智能评价系统 — 全链路评价数据
 * 基于 groupingData 中的真实学生档案，扩展六维画像、周际轨迹、评分分解与反馈
 *
 * 六维评价体系：
 *   knowledge   知识掌握度   ← KP 均分 + 错误类型
 *   computation 数值计算能力  ← 计算类 KP + 精度表现
 *   critical    批判思维     ← 参与度 + 元认知 + 误差分析行为
 *   coding      编程转化能力  ← 类型基础 + 基函数构造
 *   collab      协作贡献度   ← collaboration 原始字段
 *   teaching    师范教学转化力 ← 核心培养目标（师范生专项）
 */

import { students } from './groupingData';

export const EVAL_DIM_KEYS = ['knowledge', 'computation', 'critical', 'coding', 'collab', 'teaching'];
export const EVAL_DIM_LABELS = ['知识掌握度', '数值计算能力', '批判思维', '编程转化能力', '协作贡献度', '师范教学转化力'];
export const EVAL_DIM_COLORS = ['#10a37f', '#6366f1', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
export const EVAL_DIM_ICONS = ['📚', '🔢', '💡', '💻', '🤝', '🏫'];

export const STAGE_LABELS = ['基础认知', '概念理解', '计算应用', '分析批判', '创新迁移'];
export const STAGE_COLORS = ['#10a37f', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899'];

export const WEEKS = 6;
export const WEEK_LABELS = ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周'];

// 各类型基础参数
const TYPE_CFG = {
  A: {
    base:       { knowledge: 8.8, computation: 8.8, critical: 8.0, coding: 7.8, collab: 8.5, teaching: 8.5 },
    startRatio: 0.82,
    stages:     [92, 88, 84, 74, 58],
    style:      '系统探究型',
    aiSessions: [15, 17, 14, 16, 13],
    aiDepth:    [3.4, 3.5, 3.2, 3.6, 3.1],
  },
  B: {
    base:       { knowledge: 7.8, computation: 9.0, critical: 5.6, coding: 7.0, collab: 6.4, teaching: 5.0 },
    startRatio: 0.80,
    stages:     [87, 76, 90, 50, 28],
    style:      '精算实操型',
    aiSessions: [9, 8, 10, 7, 6],
    aiDepth:    [2.2, 2.0, 2.4, 1.9, 1.8],
  },
  C: {
    base:       { knowledge: 4.6, computation: 5.8, critical: 4.0, coding: 3.8, collab: 4.8, teaching: 3.6 },
    startRatio: 0.70,
    stages:     [63, 44, 52, 18, 6],
    style:      '脚手架依赖型',
    aiSessions: [4, 3, 5, 3, 4],
    aiDepth:    [1.2, 1.1, 1.3, 1.0, 1.2],
  },
  D: {
    base:       { knowledge: 7.0, computation: 7.6, critical: 5.8, coding: 6.0, collab: 5.6, teaching: 6.6 },
    startRatio: 0.72,
    stages:     [80, 72, 70, 50, 35],
    style:      '高潜待激活型',
    aiSessions: [7, 6, 8, 7, 5],
    aiDepth:    [2.6, 2.4, 2.8, 2.5, 2.3],
  },
  E: {
    base:       { knowledge: 6.8, computation: 7.2, critical: 5.0, coding: 5.6, collab: 3.4, teaching: 4.6 },
    startRatio: 0.78,
    stages:     [74, 60, 63, 26, 10],
    style:      '内敛潜力型',
    aiSessions: [3, 2, 4, 3, 2],
    aiDepth:    [1.5, 1.4, 1.6, 1.3, 1.5],
  },
};

// 确定性伪随机（不依赖 Math.random，确保页面刷新一致）
function jitter(studentIdx, salt, magnitude = 0.4) {
  const n = ((studentIdx * 2654435761 + salt * 2246822519) >>> 0) % 10000;
  return (n / 10000) * magnitude * 2 - magnitude;
}

function clamp(v, lo = 0, hi = 10) {
  return Math.max(lo, Math.min(hi, v));
}

const META_FACTOR = { '知道': 1.0, '模糊': 0.84, '不知道': 0.65 };

function computeDims(student, idx) {
  const cfg = TYPE_CFG[student.type];
  const kpMean = student.scores.reduce((a, b) => a + b, 0) / 4;
  const mf = META_FACTOR[student.meta] ?? 0.75;

  return {
    knowledge:   clamp(cfg.base.knowledge   * 0.60 + kpMean                     * 0.40 + jitter(idx, 0, 0.35)),
    computation: clamp(cfg.base.computation * 0.50 + student.scores[1]          * 0.50 + jitter(idx, 1, 0.30)),
    critical:    clamp(cfg.base.critical    * 0.70 + student.participation       * 0.30 * mf + jitter(idx, 2, 0.45)),
    coding:      clamp(cfg.base.coding             + student.scores[0]          * 0.10 + jitter(idx, 3, 0.45)),
    collab:      clamp(cfg.base.collab      * 0.40 + student.collaboration       * 0.60 + jitter(idx, 4, 0.25)),
    teaching:    clamp(cfg.base.teaching    * 0.70 + student.participation       * 0.30 * mf + jitter(idx, 5, 0.45)),
  };
}

function dimMean(dims) {
  return EVAL_DIM_KEYS.reduce((s, k) => s + dims[k], 0) / EVAL_DIM_KEYS.length;
}

// 各周维度值：从 startRatio×final 逐渐增长到 final；D型第3周有焦虑低谷
function genWeekly(finalDims, student, idx) {
  const cfg = TYPE_CFG[student.type];
  return Array.from({ length: WEEKS }, (_, w) => {
    let t = w / (WEEKS - 1); // 0 → 1
    // D型：第3周（索引2）焦虑峰值，维度普降
    if (student.type === 'D' && w === 2) t = Math.max(0, t - 0.25);
    const ratio = cfg.startRatio + (1 - cfg.startRatio) * t;
    const dims = {};
    EVAL_DIM_KEYS.forEach((key, ki) => {
      dims[key] = clamp(finalDims[key] * ratio + jitter(idx, w * 10 + ki, 0.25));
    });
    return { week: w + 1, label: WEEK_LABELS[w], dims, mean: dimMean(dims) };
  });
}

// 五阶完成率（加入个体抖动）
function genStages(student, idx) {
  const base = TYPE_CFG[student.type].stages;
  return base.map((v, i) => clamp(v + jitter(idx, 100 + i, 6), 0, 100));
}

// 评分分解（满分100）
function computeScore(dims, stages, weekly, student, idx) {
  const cfg = TYPE_CFG[student.type];
  const stageAvg = stages.slice(0, 3).reduce((a, b) => a + b, 0) / 3 / 100;
  const participation = student.participation / 10;
  const aiSessions = cfg.aiSessions[idx % cfg.aiSessions.length];
  const dialogueQuality = Math.min(aiSessions / 18, 1);

  const process = clamp((stageAvg * 0.45 + participation * 0.35 + dialogueQuality * 0.20) * 40, 0, 40);
  const result  = clamp(((dims.knowledge + dims.computation) / 20) * 30, 0, 30);
  const growth  = clamp((weekly[WEEKS - 1].mean - weekly[0].mean) * 2.8, 0, 20);
  const peer    = clamp((dims.collab / 10) * 10, 0, 10);
  const total   = process + result + growth + peer;
  return { process: +process.toFixed(1), result: +result.toFixed(1), growth: +growth.toFixed(1), peer: +peer.toFixed(1), total: +total.toFixed(1) };
}

// AI 对话统计
function genDialogue(student, idx) {
  const cfg = TYPE_CFG[student.type];
  const sessions = cfg.aiSessions[idx % cfg.aiSessions.length] + Math.round(jitter(idx, 200, 2));
  const depth    = +(cfg.aiDepth[idx % cfg.aiDepth.length] + jitter(idx, 201, 0.15)).toFixed(1);
  // 提问类型分布（回忆/理解/分析/创造）
  const recall = clamp(Math.round(40 - depth * 6 + jitter(idx, 202, 5)), 10, 55);
  const understand = clamp(Math.round(30 + jitter(idx, 203, 5)), 15, 45);
  const analyze = clamp(Math.round(depth * 6 + jitter(idx, 204, 4)), 5, 35);
  const create  = Math.max(0, 100 - recall - understand - analyze);
  return { sessions: Math.max(1, sessions), depth: clamp(depth, 1, 4), types: { recall, understand, analyze, create } };
}

// 个性化反馈文本
const STRENGTH_TEXTS = {
  knowledge:   '数值方法核心知识掌握扎实，五阶问题链通过率领先。',
  computation: '数值计算精度高、步骤规范，算法实现能力突出。',
  critical:    '课堂提问积极、误差分析有深度，批判性思维素养突出。',
  coding:      '编程转化能力强，能将数理推导高效转化为可运行代码。',
  collab:      '协作贡献度高，组内互助表现积极，是分组学习的核心推动者。',
  teaching:    '师范教学转化力优秀，能将数值原理通俗化、情境化地讲解。',
};
const IMPROVE_TEXTS = {
  knowledge:   '建议回顾基函数构造与误差分析基础，夯实知识体系。',
  computation: '数值计算步骤偶有遗漏，建议增加小步骤验证习惯。',
  critical:    '鼓励在课堂提出"为什么"式追问，培养批判性思维。',
  coding:      '编程转化环节存在瓶颈，建议多做伪代码→代码的逐步拆解练习。',
  collab:      '组内互动参与度偏低，建议主动承担讲解或提问角色。',
  teaching:    '师范表达迁移能力待提升，建议尝试"向初中生解释误差"的练习任务。',
};
const ALERT_TEXTS = {
  C: ['基础维度整体薄弱，建议优先补充最小脚手架例题。', '五阶完成率卡在第2阶，需教师个别辅导。'],
  D: ['数学基础不错但焦虑显著，建议给予正向强化与低门槛先行体验。', '第3周成绩波动明显，关注心理状态。'],
  E: ['课堂参与度偏低，建议主动布置低门槛任务激活参与意愿。', 'AI对话会话数极少，知识获取渠道单一。'],
};

function genFeedback(dims, student) {
  const sorted = EVAL_DIM_KEYS.slice().sort((a, b) => dims[b] - dims[a]);
  const strengths = sorted.slice(0, 2).map(k => STRENGTH_TEXTS[k]);
  const improves  = sorted.slice(-2).map(k => IMPROVE_TEXTS[k]);
  const alerts    = ALERT_TEXTS[student.type] || [];
  return { strengths, improves, alerts };
}

// ── 主构建函数 ────────────────────────────────────────────────────────────
export function buildEvalStudents(studentList = students) {
  return studentList.map((student, idx) => {
    const cfg     = TYPE_CFG[student.type];
    const dims    = computeDims(student, idx);
    const weekly  = genWeekly(dims, student, idx);
    const stages  = genStages(student, idx);
    const score   = computeScore(dims, stages, weekly, student, idx);
    const dialogue = genDialogue(student, idx);
    const feedback = genFeedback(dims, student);

    return {
      ...student,
      dims,
      weekly,
      stages,
      score,
      dialogue,
      feedback,
      style: cfg.style,
    };
  });
}

// ── 班级统计 ─────────────────────────────────────────────────────────────
export function computeClassStats(evalStudents) {
  const n = evalStudents.length;
  const avgDims = {};
  EVAL_DIM_KEYS.forEach(k => {
    avgDims[k] = evalStudents.reduce((s, st) => s + st.dims[k], 0) / n;
  });
  const avgTotal = evalStudents.reduce((s, st) => s + st.score.total, 0) / n;

  // 各维度班级均值
  const dimRankings = EVAL_DIM_KEYS.map(k => ({
    key: k,
    avg: avgDims[k],
    top3: evalStudents.slice().sort((a, b) => b.dims[k] - a.dims[k]).slice(0, 3),
    bot3: evalStudents.slice().sort((a, b) => a.dims[k] - b.dims[k]).slice(0, 3),
  }));

  // 班级周际均值
  const weeklyClass = Array.from({ length: WEEKS }, (_, w) => {
    const meanScore = evalStudents.reduce((s, st) => s + st.weekly[w].mean, 0) / n;
    const meanDims = {};
    EVAL_DIM_KEYS.forEach(k => {
      meanDims[k] = evalStudents.reduce((s, st) => s + st.weekly[w].dims[k], 0) / n;
    });
    return { week: w + 1, label: WEEK_LABELS[w], mean: meanScore, dims: meanDims };
  });

  // 需预警学生（C/D/E 型或总分 < 60）
  const alertStudents = evalStudents.filter(st =>
    ['C', 'D', 'E'].includes(st.type) || st.score.total < 62
  );

  // 互助配对建议（批判思维强者配弱者，教学转化力强者配弱者）
  const pairings = [];
  const strongCritical = evalStudents.filter(st => st.dims.critical >= 7.5).slice(0, 4);
  const weakCritical   = evalStudents.filter(st => st.dims.critical < 5.5).slice(0, 4);
  const strongTeaching = evalStudents.filter(st => st.dims.teaching >= 7.5).slice(0, 3);
  const weakTeaching   = evalStudents.filter(st => st.dims.teaching < 5.0).slice(0, 3);
  strongCritical.forEach((s, i) => {
    if (weakCritical[i]) pairings.push({ mentor: s, mentee: weakCritical[i], dim: 'critical', label: '批判思维互助' });
  });
  strongTeaching.forEach((s, i) => {
    if (weakTeaching[i]) pairings.push({ mentor: s, mentee: weakTeaching[i], dim: 'teaching', label: '教学转化互助' });
  });

  return { avgDims, avgTotal, dimRankings, weeklyClass, alertStudents, pairings, n };
}
