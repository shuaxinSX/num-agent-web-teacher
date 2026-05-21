import { useMemo, useState } from 'react';
import { students, TYPE_LABELS, TYPE_COLORS } from '../data/groupingData';
import { computeGroups, buildNetworkEdges, buildStudentGroupMap } from '../utils/groupingAlgorithm';
import { HeatmapChart } from './grouping/HeatmapChart';
import { BubbleChart } from './grouping/BubbleChart';
import { SankeyChart } from './grouping/SankeyChart';
import { NetworkGraph } from './grouping/NetworkGraph';
import { RadarChart } from './grouping/RadarChart';
import { ResultPanel } from './grouping/ResultPanel';
import './toolPages.css';

// 每组一个颜色，与分组结果对应
const GROUP_PALETTE = {
  G1: '#10a37f', G2: '#6366f1', G3: '#f59e0b', G4: '#ec4899', G5: '#8b5cf6'
};

export function GroupingPage() {
  const [mode, setMode] = useState('heterogeneous');
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  // 雷达图：最多2个学生叠加
  const [radarStudents, setRadarStudents] = useState([]);

  // 计算分组
  const groups = useMemo(() => computeGroups(mode, 5), [mode]);
  const edges = useMemo(() => buildNetworkEdges(groups), [groups]);
  const studentGroupMap = useMemo(() => buildStudentGroupMap(groups), [groups]);

  function handleSelect(id) {
    setSelectedId(prev => prev === id ? null : id);
    // 更新雷达图（最多2人）
    const s = students.find(st => st.id === id);
    if (!s) return;
    setRadarStudents(prev => {
      if (prev.find(p => p.id === id)) return prev.filter(p => p.id !== id);
      if (prev.length >= 2) return [prev[1], s];
      return [...prev, s];
    });
  }

  function handleSelectFromResult(student) {
    handleSelect(student.id);
  }

  // 全班统计
  const stats = useMemo(() => {
    const n = students.length;
    const avgScores = students[0].scores.map((_, k) =>
      students.reduce((s, st) => s + st.scores[k], 0) / n
    );
    const typeCounts = Object.fromEntries(
      Object.keys(TYPE_LABELS).map(t => [t, students.filter(s => s.type === t).length])
    );
    const avgAnxiety = students.reduce((s, st) => s + st.anxiety, 0) / n;
    const highAnxiety = students.filter(s => s.anxiety >= 4).length;
    return { avgScores, typeCounts, avgAnxiety, highAnxiety };
  }, []);

  return (
    <div className="tool-workspace grouping-page">
      <div className="tool-workspace-shell">
        <section className="tool-surface-panel tool-dashboard-hero">
          <div className="tool-dashboard-head">
            <div className="tool-dashboard-copy">
              <span className="tool-page-kicker" style={{ background: 'rgba(16, 163, 127, 0.1)', color: '#0f5f4d', border: '1px solid rgba(16, 163, 127, 0.24)' }}>
                分组策略总览与可视化诊断
              </span>
              <h2>把课前诊断转成可执行的小组结构</h2>
              <p>综合知识点表现、焦虑水平、参与倾向和角色特征，先看全班分布，再决定是异质互补还是同质分层。</p>
              <div className="tool-dashboard-meta">
                <span className="tool-dashboard-pill">23级计算机科学与技术1班</span>
                <span className="tool-dashboard-pill">分段插值专题</span>
                <span className="tool-dashboard-pill">{students.length} 名学生</span>
                <span className="tool-dashboard-pill">{mode === 'heterogeneous' ? '当前模式：异质互补' : '当前模式：同质分层'}</span>
              </div>
            </div>

            <div className="grouping-mode-switch">
              {[
                { key: 'heterogeneous', label: '异质互补', desc: '强弱搭配' },
                { key: 'homogeneous', label: '同质分层', desc: '水平相近' }
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={mode === key ? 'grouping-mode-button is-active' : 'grouping-mode-button'}
                >
                  <strong>{label}</strong>
                  <span>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grouping-stats-grid">
        {Object.entries(stats.typeCounts).map(([type, count]) => (
            <div
              key={type}
              className="grouping-stat-card"
              style={{ borderLeft: `4px solid ${TYPE_COLORS[type]}` }}
            >
              <strong style={{ color: TYPE_COLORS[type] }}>{count}</strong>
              <span>{TYPE_LABELS[type]}</span>
              <small>画像类型人数</small>
            </div>
          ))}
            <div
              className="grouping-stat-card"
              style={{ borderLeft: '4px solid #f97316' }}
            >
              <strong style={{ color: '#f97316' }}>{stats.highAnxiety}</strong>
              <span>高焦虑学生</span>
              <small>焦虑分数 ≥ 4</small>
            </div>
          </div>
        </section>

        <div className="grouping-visual-grid">
        <div className="tool-surface-panel grouping-chart-panel">
          <HeatmapChart
            students={students}
            selectedId={selectedId}
            hoveredId={hoveredId}
            studentGroupMap={studentGroupMap}
            groupColors={GROUP_PALETTE}
            onSelect={handleSelect}
            onHover={setHoveredId}
          />
        </div>

          <div className="grouping-side-stack">
            <div className="tool-surface-panel grouping-chart-panel">
            <BubbleChart
              students={students}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={handleSelect}
              onHover={setHoveredId}
            />
          </div>

            <div className="tool-surface-panel grouping-chart-panel">
            <SankeyChart
              students={students}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={handleSelect}
              onHover={setHoveredId}
            />
          </div>
        </div>

          <div className="tool-surface-panel grouping-result-panel">
          <ResultPanel
            groups={groups}
            groupColors={GROUP_PALETTE}
            selectedId={selectedId}
            onSelectStudent={handleSelectFromResult}
            mode={mode}
          />
        </div>
        </div>

        <div className="tool-surface-panel grouping-network-panel">
        <NetworkGraph
          students={students}
          groups={groups}
          edges={edges}
          studentGroupMap={studentGroupMap}
          groupColors={GROUP_PALETTE}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          onHover={setHoveredId}
          mode={mode}
        />
        </div>

      {selectedId && (
          <div className="grouping-selected-note">
          {(() => {
            const s = students.find(st => st.id === selectedId);
            return s ? `已选中 ${s.name}（${s.role}）· 点击右下角雷达图查看详情 · 再点一次取消选中` : null;
          })()}
        </div>
      )}

      {radarStudents.length > 0 && (
        <RadarChart
          students={radarStudents}
          groupColors={GROUP_PALETTE}
          studentGroupMap={studentGroupMap}
          onClose={() => setRadarStudents([])}
        />
      )}
      </div>
    </div>
  );
}
