import { KP_LABELS, KP_COLORS, TYPE_LABELS, TYPE_COLORS } from '../../data/groupingData';

function MiniBar({ value, max = 10, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
      <div style={{ flex: 1, height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 9, color: '#9ca3af', width: 24, textAlign: 'right' }}>{value.toFixed(1)}</span>
    </div>
  );
}

function MemberTag({ student, groupColor, onClick }) {
  return (
    <button
      onClick={() => onClick(student)}
      title={`${student.name}  综合${(student.scores.reduce((a, b) => a + b, 0) / 4).toFixed(1)} · 焦虑${student.anxiety}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 7px', borderRadius: 6,
        border: `1.5px solid ${TYPE_COLORS[student.type]}30`,
        background: TYPE_COLORS[student.type] + '12',
        cursor: 'pointer',
        fontSize: 11, fontWeight: 500, color: '#1f2937'
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        background: groupColor, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700, flexShrink: 0
      }}>{student.name.slice(0, 1)}</span>
      <span>{student.name}</span>
      <span style={{
        fontSize: 9, padding: '0 3px', borderRadius: 3,
        background: TYPE_COLORS[student.type] + '30', color: TYPE_COLORS[student.type]
      }}>{student.role}</span>
    </button>
  );
}

export function ResultPanel({ groups, groupColors, selectedId, onSelectStudent, mode }) {
  function exportText() {
    const lines = groups.map(g => {
      const members = g.members.map(m => m.name).join('、');
      return `${g.label}（${g.members.length}人）：${members}`;
    });
    const text = [`分组模式：${mode === 'heterogeneous' ? '异质互补' : '同质分层'}`,
      '', ...lines].join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    alert('分组方案已复制到剪贴板');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          分组结果
          <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>
            {mode === 'heterogeneous' ? '异质互补' : '同质分层'} · {groups.length}组
          </span>
        </span>
        <button
          onClick={exportText}
          style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 6,
            border: '1px solid #d1d5db', background: 'white',
            cursor: 'pointer', color: '#374151'
          }}
        >复制分组</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
        {groups.map(group => {
          const color = groupColors[group.id];
          const { avgKP, avgAnxiety, avgParticipation, coverageScore, roles } = group.stats;
          const hasLeader = group.members.some(m => m.type === 'A');
          const roleSet = new Set(group.members.map(m => m.role));

          return (
            <div key={group.id} style={{
              background: 'white',
              border: `1.5px solid ${color}40`,
              borderLeft: `4px solid ${color}`,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
            }}>
              {/* 组头 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color }}>
                    {group.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{group.members.length}人</span>
                  {hasLeader && (
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4,
                      background: '#f0fdf4', color: '#10a37f', border: '1px solid #d1fae5'
                    }}>含组长候选</span>
                  )}
                </div>
                {/* 角色覆盖 */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {['构造', '验证', '计算', '讲解', '组织'].map(role => (
                    <span key={role} style={{
                      fontSize: 8, padding: '1px 4px', borderRadius: 3,
                      background: roleSet.has(role) ? '#eff6ff' : '#f9fafb',
                      color: roleSet.has(role) ? '#3b82f6' : '#d1d5db',
                      border: `1px solid ${roleSet.has(role) ? '#bfdbfe' : '#e5e7eb'}`
                    }}>{role}</span>
                  ))}
                </div>
              </div>

              {/* 成员标签 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {group.members.map(m => (
                  <MemberTag key={m.id} student={m} groupColor={color} onClick={onSelectStudent} />
                ))}
              </div>

              {/* 知识点均分条 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {KP_LABELS.map((label, k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: KP_COLORS[k], width: 52, textAlign: 'right', flexShrink: 0 }}>{label}</span>
                    <MiniBar value={avgKP[k]} max={10} color={KP_COLORS[k]} />
                  </div>
                ))}
              </div>

              {/* 组内统计 */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 6, borderTop: '1px solid #f3f4f6' }}>
                <Stat label="焦虑均值" value={avgAnxiety.toFixed(1)} warn={avgAnxiety > 3.5} />
                <Stat label="参与度" value={avgParticipation.toFixed(1)} warn={avgParticipation < 4} />
                <Stat label="知识互补度" value={`${(coverageScore * 100).toFixed(0)}%`} highlight />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, warn, highlight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
      <span style={{ fontSize: 9, color: '#9ca3af' }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: highlight ? '#10a37f' : warn ? '#f97316' : '#374151'
      }}>{value}</span>
    </div>
  );
}
