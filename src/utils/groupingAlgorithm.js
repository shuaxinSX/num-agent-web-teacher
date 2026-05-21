/**
 * 课前弹性分组算法
 *
 * 支持两种模式：
 *   heterogeneous — 异质互补（强弱搭配 + 角色互补）
 *   homogeneous   — 同质分层（知识短板相近，便于同步辅导）
 */

import { students } from '../data/groupingData';

// ── 工具函数 ─────────────────────────────────────────────────────────

function avgScore(student) {
  return student.scores.reduce((a, b) => a + b, 0) / student.scores.length;
}

/** 欧氏距离（知识点得分向量） */
function euclidean(s1, s2) {
  return Math.sqrt(s1.scores.reduce((sum, v, i) => sum + (v - s2.scores[i]) ** 2, 0));
}

/**
 * 互补度评分 (0–1)
 * 衡量两学生是否适合异质分组
 * - 知识互补：i强于j的维度能补j的弱项
 * - 角色不同加分
 * - 焦虑均衡（避免两高焦虑在一组）
 */
function complementScore(a, b) {
  // 知识互补：每个维度，强者得分越高对弱者帮助越大
  let knowledgeComp = 0;
  for (let k = 0; k < 4; k++) {
    const diff = Math.abs(a.scores[k] - b.scores[k]);
    knowledgeComp += diff / 10;  // 差距越大越互补
  }
  knowledgeComp /= 4;

  // 角色互补
  const roleComp = a.role !== b.role ? 0.3 : 0;

  // 焦虑均衡（两人都高焦虑则减分）
  const anxietyPenalty = (a.anxiety >= 4 && b.anxiety >= 4) ? -0.2 : 0;

  // 参与互补（低参与+高参与搭配）
  const partComp = Math.abs(a.participation - b.participation) / 9 * 0.2;

  return knowledgeComp * 0.5 + roleComp + anxietyPenalty + partComp;
}

/**
 * 相似度评分 (0–1，值越高越相似)
 * 用于同质分组
 */
function similarityScore(a, b) {
  const maxDist = Math.sqrt(4 * 10 ** 2); // 最大可能距离
  return 1 - euclidean(a, b) / maxDist;
}

// ── 分组算法 ──────────────────────────────────────────────────────────

/**
 * 异质互补分组
 * 算法：
 * 1. 按综合得分排序，取前 groupSize 名各作为初始组核
 * 2. 剩余学生按互补度贪心分配
 */
function heterogeneousGrouping(studentList, numGroups) {
  const sorted = [...studentList].sort((a, b) => avgScore(b) - avgScore(a));
  const groups = sorted.slice(0, numGroups).map((s) => [s]);
  const remaining = sorted.slice(numGroups);

  for (const student of remaining) {
    // 找互补度最高且人数最少的组
    let bestGroup = 0;
    let bestScore = -Infinity;
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].length >= Math.ceil(studentList.length / numGroups)) continue;
      const groupScore = groups[g].reduce((sum, m) => sum + complementScore(student, m), 0) / groups[g].length;
      // 额外：同宿舍成员不超过2人
      const sameDorm = groups[g].filter(m => m.dorm === student.dorm).length;
      const dormPenalty = sameDorm >= 2 ? -0.5 : 0;
      if (groupScore + dormPenalty > bestScore) {
        bestScore = groupScore + dormPenalty;
        bestGroup = g;
      }
    }
    groups[bestGroup].push(student);
  }
  return groups;
}

/**
 * 同质分层分组（K-means 简化版）
 * 按知识综合水平聚类，水平相近的分在一组
 */
function homogeneousGrouping(studentList, numGroups) {
  // 按综合得分排序后均匀切割（确保每组水平接近）
  const sorted = [...studentList].sort((a, b) => avgScore(b) - avgScore(a));
  const groups = Array.from({ length: numGroups }, () => []);

  // 蛇形分配保证均衡：1,2,3,4,5 → 5,4,3,2,1 → 1,2,3...
  sorted.forEach((student, i) => {
    const round = Math.floor(i / numGroups);
    const pos = i % numGroups;
    const groupIdx = round % 2 === 0 ? pos : numGroups - 1 - pos;
    groups[groupIdx].push(student);
  });
  return groups;
}

// ── 组内统计 ──────────────────────────────────────────────────────────

export function computeGroupStats(group) {
  const n = group.length;
  const avgKP = group[0].scores.map((_, k) =>
    group.reduce((s, m) => s + m.scores[k], 0) / n
  );
  const roles = [...new Set(group.map(m => m.role))];
  const avgAnxiety = group.reduce((s, m) => s + m.anxiety, 0) / n;
  const avgParticipation = group.reduce((s, m) => s + m.participation, 0) / n;
  const avgCollaboration = group.reduce((s, m) => s + m.collaboration, 0) / n;
  const avgOverall = group.reduce((s, m) => s + avgScore(m), 0) / n;

  // 知识覆盖宽度：各知识点得分最高与最低之差（越大越互补）
  const coverageRange = avgKP.map((avg, k) => {
    const vals = group.map(m => m.scores[k]);
    return Math.max(...vals) - Math.min(...vals);
  });
  const coverageScore = coverageRange.reduce((s, r) => s + r, 0) / (4 * 10);

  return { avgKP, roles, avgAnxiety, avgParticipation, avgCollaboration, avgOverall, coverageScore };
}

// ── 主接口 ────────────────────────────────────────────────────────────

export function computeGroups(mode = 'heterogeneous', numGroups = 5) {
  const groups = mode === 'heterogeneous'
    ? heterogeneousGrouping(students, numGroups)
    : homogeneousGrouping(students, numGroups);

  return groups.map((members, i) => ({
    id: `G${i + 1}`,
    label: `第${['一', '二', '三', '四', '五', '六'][i]}组`,
    members,
    stats: computeGroupStats(members)
  }));
}

/** 构建网络图边（同组内连线） */
export function buildNetworkEdges(groupResult) {
  const edges = [];
  groupResult.forEach(group => {
    const members = group.members;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const comp = complementScore(members[i], members[j]);
        edges.push({
          source: members[i].id,
          target: members[j].id,
          groupId: group.id,
          weight: comp  // 0–1，越高越适合同组
        });
      }
    }
  });
  return edges;
}

/** 学生 id → 所属 groupId 映射 */
export function buildStudentGroupMap(groupResult) {
  const map = {};
  groupResult.forEach(group => {
    group.members.forEach(m => { map[m.id] = group.id; });
  });
  return map;
}
