/**
 * 23级计算机科学与技术1班 — 课前弹性分组数据
 *
 * 学号/姓名/性别/宿舍 来自真实档案，
 * 知识诊断得分、错误类型、元认知、焦虑等为课前测验构造数据。
 * 课题：分段插值（Hermite / PCHIP），知识点：
 *   基函数构造 / 分式运算 / 节点验证 / 结构概括
 */

export const KP_LABELS = ['基函数构造', '分式运算', '节点验证', '结构概括'];

// 颜色映射供图表复用
export const KP_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899'];

export const ERROR_TYPES = ['正确', '步骤遗漏', '运算错误', '概念误解', '无从入手'];
export const ERROR_COLORS = ['#10a37f', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

export const ROLE_OPTIONS = ['构造', '验证', '计算', '讲解', '组织'];
export const ROLE_ICONS = { 构造: '🔨', 验证: '✅', 计算: '🔢', 讲解: '📢', 组织: '📋' };

export const META_OPTIONS = ['知道', '模糊', '不知道'];

/**
 * 原始成绩参考（来自学情档案）
 * 数值分析 / 高数I / 高数II / 线代 用于辅助构造合理的诊断得分
 */

// scores: [基函数构造, 分式运算, 节点验证, 结构概括]  均 0–10
// errors: [对应知识点的主要错误类型]
// time: 完成时间（分钟）
// anxiety: 焦虑感 1–5
// meta: 元认知清晰度
// role: 角色偏好
// participation: 参与主动性 1–10
// collaboration: 表达合作指数 1–10
// type: 内部分类标签（供算法参考）

export const students = [
  {
    id: '2023210780', name: '苏文妹', gender: '女', dorm: '3#115',
    // 数值分析88, 高数99, 线代87 → 全能型标杆
    scores: [9.2, 9.5, 9.0, 9.3],
    errors: ['正确', '正确', '正确', '正确'],
    time: 13, anxiety: 1, meta: '知道', role: '讲解',
    participation: 9, collaboration: 9, type: 'A'
  },
  {
    id: '2023210787', name: '哈玉娟', gender: '女', dorm: '3#115',
    // 数值分析87, 高数89, 线代90
    scores: [8.8, 9.0, 8.7, 8.5],
    errors: ['正确', '正确', '正确', '正确'],
    time: 15, anxiety: 1, meta: '知道', role: '讲解',
    participation: 8, collaboration: 8, type: 'A'
  },
  {
    id: '2023210772', name: '李学琴', gender: '女', dorm: '3#102',
    // 数值分析86, 高数91/93, 线代79 → 概括能力突出
    scores: [8.5, 8.2, 8.8, 9.1],
    errors: ['正确', '步骤遗漏', '正确', '正确'],
    time: 14, anxiety: 2, meta: '知道', role: '组织',
    participation: 9, collaboration: 8, type: 'A'
  },
  {
    id: '2023210770', name: '马家璇', gender: '女', dorm: '3#102',
    // 数值分析82, 高数96, 线代86 → 构造能力强, 分式运算有瑕疵
    scores: [8.7, 7.5, 8.0, 8.8],
    errors: ['正确', '步骤遗漏', '步骤遗漏', '正确'],
    time: 16, anxiety: 1, meta: '知道', role: '构造',
    participation: 8, collaboration: 9, type: 'A'
  },
  {
    id: '2023210779', name: '杨金燕', gender: '女', dorm: '3#102',
    // 数值分析82, 高数88, 线代89 → 全面均衡
    scores: [8.0, 8.3, 7.8, 7.5],
    errors: ['步骤遗漏', '步骤遗漏', '步骤遗漏', '步骤遗漏'],
    time: 17, anxiety: 2, meta: '知道', role: '组织',
    participation: 8, collaboration: 8, type: 'A'
  },
  // ── B型：偏计算型 ────────────────────────────────────────────────
  {
    id: '2023210785', name: '马玲玲', gender: '女', dorm: '3#115',
    // 数值分析87, 高数84, 线代70 → 运算精准但概括薄弱
    scores: [7.5, 9.2, 8.8, 6.8],
    errors: ['步骤遗漏', '正确', '正确', '运算错误'],
    time: 16, anxiety: 1, meta: '模糊', role: '计算',
    participation: 7, collaboration: 6, type: 'B'
  },
  {
    id: '2023210784', name: '马源', gender: '女', dorm: '3#115',
    // 数值分析85, 高数87, 线代80 → 运算能力强
    scores: [7.8, 9.0, 8.5, 7.0],
    errors: ['步骤遗漏', '正确', '正确', '步骤遗漏'],
    time: 18, anxiety: 2, meta: '模糊', role: '计算',
    participation: 7, collaboration: 7, type: 'B'
  },
  {
    id: '2023210776', name: '杨凯', gender: '男', dorm: '6#310',
    // 数值分析80（访学）, 高数92/89, 线代92
    scores: [7.8, 8.5, 7.5, 7.2],
    errors: ['步骤遗漏', '正确', '步骤遗漏', '步骤遗漏'],
    time: 21, anxiety: 1, meta: '知道', role: '构造',
    participation: 7, collaboration: 6, type: 'B'
  },
  {
    id: '2023210793', name: '虎海龙', gender: '男', dorm: '6#312',
    // 数值分析80, 高数91, 线代84 → 运算可靠, 结构弱
    scores: [6.8, 8.5, 7.8, 5.8],
    errors: ['运算错误', '正确', '步骤遗漏', '运算错误'],
    time: 20, anxiety: 2, meta: '模糊', role: '计算',
    participation: 7, collaboration: 7, type: 'B'
  },
  {
    id: '2023210786', name: '马小宇', gender: '男', dorm: '6#310',
    // 数值分析79, 高数74, 线代69 → 纯计算型, 基函数和概括弱
    scores: [6.0, 8.8, 7.5, 5.5],
    errors: ['运算错误', '正确', '步骤遗漏', '运算错误'],
    time: 19, anxiety: 2, meta: '模糊', role: '计算',
    participation: 6, collaboration: 5, type: 'B'
  },
  // ── C型：理解困难型 ──────────────────────────────────────────────
  {
    id: '2023210773', name: '申立泽', gender: '男', dorm: '6#310',
    // 数值分析70, 高数74, 线代71 → 全面薄弱, 不知原因
    scores: [4.2, 6.5, 5.2, 3.2],
    errors: ['概念误解', '运算错误', '运算错误', '概念误解'],
    time: 27, anxiety: 4, meta: '不知道', role: '验证',
    participation: 4, collaboration: 5, type: 'C'
  },
  {
    id: '2023210794', name: '吴国浩', gender: '男', dorm: '6#312',
    // 数值分析69, 高数63, 线代61 → 全班垫底, 基础薄弱
    scores: [3.5, 5.8, 4.8, 2.8],
    errors: ['概念误解', '运算错误', '概念误解', '无从入手'],
    time: 30, anxiety: 4, meta: '不知道', role: '计算',
    participation: 4, collaboration: 5, type: 'C'
  },
  {
    id: '2023210788', name: '田鑫', gender: '男', dorm: '6#312',
    // 数值分析75, 高数66, 线代72 → 基础弱, 概念混乱
    scores: [4.5, 6.8, 6.5, 3.5],
    errors: ['概念误解', '运算错误', '运算错误', '概念误解'],
    time: 25, anxiety: 4, meta: '不知道', role: '计算',
    participation: 5, collaboration: 6, type: 'C'
  },
  {
    id: '2023210774', name: '姚海洋', gender: '男', dorm: '6#310',
    // 数值分析76, 高数68, 线代70 → 运算勉强, 理论空白
    scores: [5.5, 7.0, 6.5, 4.5],
    errors: ['运算错误', '步骤遗漏', '运算错误', '概念误解'],
    time: 24, anxiety: 3, meta: '模糊', role: '验证',
    participation: 5, collaboration: 5, type: 'C'
  },
  {
    id: '2023210782', name: '虎陈晖', gender: '男', dorm: '6#310',
    // 数值分析74, 高数75, 线代69 → 基函数和结构概括严重欠缺
    scores: [4.8, 7.5, 5.5, 3.8],
    errors: ['概念误解', '步骤遗漏', '运算错误', '概念误解'],
    time: 27, anxiety: 4, meta: '不知道', role: '计算',
    participation: 4, collaboration: 5, type: 'C'
  },
  // ── D型：焦虑高能型 ──────────────────────────────────────────────
  {
    id: '2023210777', name: '赵雪霜', gender: '女', dorm: '3#102',
    // 数值分析83, 高数89, 线代68 → 能力不错但极度焦虑, 耗时长
    scores: [7.8, 8.5, 7.5, 6.5],
    errors: ['步骤遗漏', '正确', '步骤遗漏', '步骤遗漏'],
    time: 28, anxiety: 4, meta: '知道', role: '验证',
    participation: 5, collaboration: 6, type: 'D'
  },
  {
    id: '2023210778', name: '刘顺', gender: '男', dorm: '6#310',
    // 数值分析74, 高数88, 线代66 → 高数强但数分转化困难+焦虑
    scores: [6.5, 7.5, 6.0, 5.0],
    errors: ['运算错误', '步骤遗漏', '运算错误', '运算错误'],
    time: 30, anxiety: 4, meta: '模糊', role: '验证',
    participation: 4, collaboration: 5, type: 'D'
  },
  {
    id: '2023210789', name: '马常红', gender: '女', dorm: '3#102',
    // 数值分析73, 高数88, 线代79 → 数学基础好但极焦虑, 概念模糊
    scores: [6.5, 7.8, 6.2, 5.5],
    errors: ['运算错误', '步骤遗漏', '运算错误', '运算错误'],
    time: 32, anxiety: 5, meta: '知道', role: '验证',
    participation: 5, collaboration: 6, type: 'D'
  },
  {
    id: '2023210790', name: '杨欣越', gender: '女', dorm: '3#116',
    // 数值分析72, 高数96, 线代93 → 高数极强但数分迁移差+高焦虑
    scores: [5.5, 8.0, 5.8, 4.5],
    errors: ['运算错误', '步骤遗漏', '运算错误', '概念误解'],
    time: 35, anxiety: 5, meta: '模糊', role: '计算',
    participation: 4, collaboration: 5, type: 'D'
  },
  {
    id: '2023210781', name: '马悦', gender: '女', dorm: '3#115',
    // 数值分析84, 高数83, 线代75 → 能力中上但焦虑拖慢进度
    scores: [7.5, 7.8, 8.0, 7.2],
    errors: ['步骤遗漏', '步骤遗漏', '步骤遗漏', '步骤遗漏'],
    time: 22, anxiety: 3, meta: '知道', role: '验证',
    participation: 6, collaboration: 7, type: 'D'
  },
  // ── E型：参与低迷型 ──────────────────────────────────────────────
  {
    id: '2023210783', name: '杨涵', gender: '女', dorm: '3#115',
    // 数值分析85, 高数72, 线代65 → 能力强但课堂极度游离
    scores: [8.2, 7.5, 8.5, 8.0],
    errors: ['步骤遗漏', '步骤遗漏', '正确', '步骤遗漏'],
    time: 17, anxiety: 2, meta: '模糊', role: '构造',
    participation: 3, collaboration: 4, type: 'E'
  },
  {
    id: '2023210771', name: '白玲', gender: '女', dorm: '3#102',
    // 数值分析77, 高数85, 线代91 → 中等偏上, 参与意愿低
    scores: [6.8, 7.5, 7.2, 5.5],
    errors: ['运算错误', '步骤遗漏', '步骤遗漏', '运算错误'],
    time: 23, anxiety: 3, meta: '模糊', role: '组织',
    participation: 4, collaboration: 5, type: 'E'
  },
  {
    id: '2023210775', name: '王甜', gender: '女', dorm: '3#116',
    // 数值分析69, 高数89, 线代86 → 数学基础不差但严重内敛退缩
    scores: [6.5, 7.2, 5.8, 4.5],
    errors: ['运算错误', '步骤遗漏', '运算错误', '概念误解'],
    time: 26, anxiety: 3, meta: '模糊', role: '组织',
    participation: 3, collaboration: 4, type: 'E'
  },
  {
    id: '2023210791', name: '马思忠', gender: '男', dorm: '6#312',
    // 数值分析73, 高数85, 线代70 → 不参与, 成绩中下
    scores: [5.8, 7.2, 5.5, 4.5],
    errors: ['运算错误', '步骤遗漏', '运算错误', '概念误解'],
    time: 28, anxiety: 3, meta: '不知道', role: '组织',
    participation: 3, collaboration: 4, type: 'E'
  },
  {
    id: '2023210792', name: '马丽', gender: '女', dorm: '3#116',
    // 数值分析72, 高数88, 线代86 → 有潜力但极度沉默
    scores: [6.0, 7.0, 5.5, 4.8],
    errors: ['运算错误', '步骤遗漏', '运算错误', '概念误解'],
    time: 29, anxiety: 2, meta: '不知道', role: '组织',
    participation: 3, collaboration: 4, type: 'E'
  }
];

export const TYPE_LABELS = {
  A: '全能型',
  B: '偏计算型',
  C: '理解困难型',
  D: '焦虑高能型',
  E: '参与低迷型'
};

export const TYPE_COLORS = {
  A: '#10a37f',
  B: '#6366f1',
  C: '#ef4444',
  D: '#f59e0b',
  E: '#8b5cf6'
};
