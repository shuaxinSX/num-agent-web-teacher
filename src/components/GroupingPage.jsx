import { useMemo, useState, useRef } from 'react';
import { TYPE_LABELS, TYPE_COLORS } from '../data/groupingData';
import { computeGroups, buildNetworkEdges, buildStudentGroupMap } from '../utils/groupingAlgorithm';
import { getStoredStudents, saveStudents, parseCSVText } from '../utils/studentDataStore';
import { DataManagementModal } from './DataManagementModal';
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
  const [currentStudents, setCurrentStudents] = useState(() => getStoredStudents());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState('heterogeneous');
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  // 雷达图：最多2个学生叠加
  const [radarStudents, setRadarStudents] = useState([]);

  const pageFileInputRef = useRef(null);

  const handlePageCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const importedList = parseCSVText(text);

      if (importedList.length > 0) {
        saveStudents(importedList);
        setCurrentStudents(importedList);
        setRadarStudents([]);
        setSelectedId(null);
        alert(`成功导入 ${importedList.length} 条学生数据！`);
      } else {
        alert("未能识别到有效的学生数据，请检查 CSV 模板格式。");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // 计算分组
  const groups = useMemo(() => computeGroups(currentStudents, mode, 5), [currentStudents, mode]);
  const edges = useMemo(() => buildNetworkEdges(groups), [groups]);
  const studentGroupMap = useMemo(() => buildStudentGroupMap(groups), [groups]);

  function handleSelect(id) {
    setSelectedId(prev => prev === id ? null : id);
    // 更新雷达图（最多2人）
    const s = currentStudents.find(st => st.id === id);
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
    const n = currentStudents.length;
    if (n === 0) return { avgScores: [0, 0, 0, 0], typeCounts: {}, avgAnxiety: 0, highAnxiety: 0 };
    const avgScores = currentStudents[0].scores.map((_, k) =>
      currentStudents.reduce((s, st) => s + st.scores[k], 0) / n
    );
    const typeCounts = Object.fromEntries(
      Object.keys(TYPE_LABELS).map(t => [t, currentStudents.filter(s => s.type === t).length])
    );
    const avgAnxiety = currentStudents.reduce((s, st) => s + st.anxiety, 0) / n;
    const highAnxiety = currentStudents.filter(s => s.anxiety >= 4).length;
    return { avgScores, typeCounts, avgAnxiety, highAnxiety };
  }, [currentStudents]);

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
              <div className="tool-dashboard-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="tool-dashboard-pill">23级计算机科学与技术1班</span>
                <span className="tool-dashboard-pill">分段插值专题</span>
                <span className="tool-dashboard-pill">{currentStudents.length} 名学生</span>
                <span className="tool-dashboard-pill">{mode === 'heterogeneous' ? '当前模式：异质互补' : '当前模式：同质分层'}</span>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="data-mgmt-trigger-btn"
                  style={{
                    background: '#10a37f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(16, 163, 127, 0.2)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => e.target.style.background = '#0d8a6a'}
                  onMouseOut={(e) => e.target.style.background = '#10a37f'}
                >
                  📁 管理学生数据
                </button>
                <button 
                  onClick={() => pageFileInputRef.current.click()}
                  style={{
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => e.target.style.background = '#4338ca'}
                  onMouseOut={(e) => e.target.style.background = '#4f46e5'}
                >
                  📤 导入名单 (CSV)
                </button>
                <input 
                  type="file" 
                  ref={pageFileInputRef} 
                  style={{ display: "none" }} 
                  accept=".csv" 
                  onChange={handlePageCSVUpload} 
                />
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
              students={currentStudents}
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
                students={currentStudents}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={handleSelect}
                onHover={setHoveredId}
              />
            </div>

            <div className="tool-surface-panel grouping-chart-panel">
              <SankeyChart
                students={currentStudents}
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
            students={currentStudents}
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
              const s = currentStudents.find(st => st.id === selectedId);
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

      <DataManagementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDataChanged={(newList) => {
          setCurrentStudents(newList);
          setRadarStudents([]);
          setSelectedId(null);
        }}
        mode="grouping"
      />
    </div>
  );
}
