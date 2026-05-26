import React, { useState, useRef } from "react";
import { 
  getStoredStudents, 
  saveStudents, 
  resetStudents, 
  assignStudentType 
} from "../utils/studentDataStore";
import { ROLE_OPTIONS, META_OPTIONS } from "../data/groupingData";
import "./DataManagementModal.css";

export function DataManagementModal({ isOpen, onClose, onDataChanged }) {
  const [studentsList, setStudentsList] = useState(() => getStoredStudents());
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Form State
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formGender, setFormGender] = useState("男");
  const [formDorm, setFormDorm] = useState("6#301");
  const [formScore1, setFormScore1] = useState(8.0);
  const [formScore2, setFormScore2] = useState(8.0);
  const [formScore3, setFormScore3] = useState(8.0);
  const [formScore4, setFormScore4] = useState(8.0);
  const [formTime, setFormTime] = useState(15);
  const [formAnxiety, setFormAnxiety] = useState(2);
  const [formMeta, setFormMeta] = useState("知道");
  const [formRole, setFormRole] = useState("计算");
  const [formParticipation, setFormParticipation] = useState(8);
  const [formCollaboration, setFormCollaboration] = useState(8);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setFormId(s.id);
    setFormName(s.name);
    setFormGender(s.gender || "男");
    setFormDorm(s.dorm || "");
    setFormScore1(s.scores[0]);
    setFormScore2(s.scores[1]);
    setFormScore3(s.scores[2]);
    setFormScore4(s.scores[3]);
    setFormTime(s.time || 15);
    setFormAnxiety(s.anxiety || 2);
    setFormMeta(s.meta || "知道");
    setFormRole(s.role || "计算");
    setFormParticipation(s.participation || 8);
    setFormCollaboration(s.collaboration || 8);
  };

  const handleClearForm = () => {
    setSelectedStudent(null);
    setFormId("");
    setFormName("");
    setFormGender("男");
    setFormDorm("6#301");
    setFormScore1(8.0);
    setFormScore2(8.0);
    setFormScore3(8.0);
    setFormScore4(8.0);
    setFormTime(15);
    setFormAnxiety(2);
    setFormMeta("知道");
    setFormRole("计算");
    setFormParticipation(8);
    setFormCollaboration(8);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formId || !formName) {
      alert("学号和姓名不能为空！");
      return;
    }

    const updatedScores = [
      parseFloat(formScore1) || 0,
      parseFloat(formScore2) || 0,
      parseFloat(formScore3) || 0,
      parseFloat(formScore4) || 0
    ];

    const studentData = {
      id: formId,
      name: formName,
      gender: formGender,
      dorm: formDorm,
      scores: updatedScores,
      time: parseInt(formTime) || 15,
      anxiety: parseInt(formAnxiety) || 2,
      meta: formMeta,
      role: formRole,
      participation: parseFloat(formParticipation) || 8,
      collaboration: parseFloat(formCollaboration) || 8,
      type: assignStudentType(updatedScores)
    };

    if (selectedStudent) {
      // Edit
      const newList = studentsList.map(s => s.id === selectedStudent.id ? studentData : s);
      setStudentsList(newList);
    } else {
      // Add
      if (studentsList.some(s => s.id === formId)) {
        alert("该学号已存在！");
        return;
      }
      setStudentsList([...studentsList, studentData]);
    }
    handleClearForm();
  };

  const handleDeleteStudent = (id) => {
    if (confirm("确定要删除该学生的数据吗？")) {
      const newList = studentsList.filter(s => s.id !== id);
      setStudentsList(newList);
      if (selectedStudent && selectedStudent.id === id) {
        handleClearForm();
      }
    }
  };

  const handleApply = () => {
    saveStudents(studentsList);
    onDataChanged(studentsList);
    onClose();
  };

  const handleReset = () => {
    if (confirm("确定要恢复默认的诊断数据吗？这会清除您本地的所有修改。")) {
      const defaultList = resetStudents();
      setStudentsList(defaultList);
      handleClearForm();
    }
  };

  const downloadCSVTemplate = () => {
    const headers = "学号,姓名,性别,宿舍,基函数构造得分(0-10),分式运算得分(0-10),节点验证得分(0-10),结构概括得分(0-10),完成时间(分钟),焦虑感(1-5),元认知(知道/模糊/不知道),角色偏好(讲解/组织/计算/构造/验证),参与主动性(1-10),协作合作指数(1-10)\n";
    const example = "2023210799,王*明,男,6#301,9.0,8.5,8.0,7.5,15,2,知道,讲解,8.5,8.0\n";
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), headers + example], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "数值分析学生成绩导入模板.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("CSV 文件内容为空或格式不正确！");
        return;
      }

      const importedList = [];
      let hasError = false;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length < 14) continue;

        const updatedScores = [
          parseFloat(cols[4]) || 0,
          parseFloat(cols[5]) || 0,
          parseFloat(cols[6]) || 0,
          parseFloat(cols[7]) || 0
        ];

        importedList.push({
          id: cols[0],
          name: cols[1],
          gender: cols[2],
          dorm: cols[3],
          scores: updatedScores,
          time: parseInt(cols[8]) || 15,
          anxiety: parseInt(cols[9]) || 3,
          meta: cols[10] || "模糊",
          role: cols[11] || "计算",
          participation: parseFloat(cols[12]) || 5,
          collaboration: parseFloat(cols[13]) || 5,
          type: assignStudentType(updatedScores)
        });
      }

      if (importedList.length > 0) {
        setStudentsList(importedList);
        alert(`成功导入 ${importedList.length} 条学生数据！请点击底部的“保存并应用”按钮生效。`);
      } else {
        alert("未能识别到有效的学生数据，请检查 CSV 模板格式。");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="data-modal-overlay">
      <div className="data-modal-box">
        <div className="data-modal-header">
          <h3>📁 教学诊断数据源管理</h3>
          <button className="data-modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="data-modal-body">
          {/* Action Toolbar */}
          <div className="data-actions-toolbar">
            <button className="data-btn secondary" onClick={downloadCSVTemplate}>
              📥 下载 CSV 模板
            </button>
            <button className="data-btn secondary" onClick={() => fileInputRef.current.click()}>
              📤 导入 CSV 数据
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept=".csv" 
              onChange={handleFileUpload} 
            />
            <button className="data-btn danger-light" onClick={handleReset}>
              🔄 恢复系统默认数据
            </button>
          </div>

          <div className="data-workspace-grid">
            {/* List Section */}
            <div className="data-list-section">
              <h4>学生列表 ({studentsList.length} 人)</h4>
              <div className="data-table-container">
                <table className="data-students-table">
                  <thead>
                    <tr>
                      <th>学号</th>
                      <th>姓名</th>
                      <th>性别</th>
                      <th>宿舍</th>
                      <th>均分</th>
                      <th>焦虑</th>
                      <th>角色</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map((s) => {
                      const avg = (s.scores.reduce((a,b)=>a+b, 0) / 4).toFixed(1);
                      return (
                        <tr 
                          key={s.id} 
                          onClick={() => handleSelectStudent(s)}
                          className={selectedStudent && selectedStudent.id === s.id ? "is-selected" : ""}
                        >
                          <td>{s.id}</td>
                          <td><strong>{s.name}</strong></td>
                          <td>{s.gender}</td>
                          <td>{s.dorm}</td>
                          <td>{avg}</td>
                          <td>{s.anxiety}</td>
                          <td>{s.role}</td>
                          <td>
                            <button 
                              className="data-row-del-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(s.id);
                              }}
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form Section */}
            <div className="data-form-section">
              <h4>{selectedStudent ? "📝 编辑学生数据" : "➕ 新增学生数据"}</h4>
              <form onSubmit={handleSaveForm} className="data-student-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>学号</label>
                    <input 
                      type="text" 
                      value={formId} 
                      onChange={(e) => setFormId(e.target.value)} 
                      placeholder="如 2023210780" 
                      disabled={!!selectedStudent} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>姓名</label>
                    <input 
                      type="text" 
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)} 
                      placeholder="学生姓名" 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>性别</label>
                    <select value={formGender} onChange={(e) => setFormGender(e.target.value)}>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>宿舍</label>
                    <input 
                      type="text" 
                      value={formDorm} 
                      onChange={(e) => setFormDorm(e.target.value)} 
                      placeholder="如 6#301" 
                    />
                  </div>
                </div>

                <h5 className="section-divider">📌 四维诊断分数 (0–10分)</h5>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>基函数构造</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10" 
                      value={formScore1} 
                      onChange={(e) => setFormScore1(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>分式运算</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10" 
                      value={formScore2} 
                      onChange={(e) => setFormScore2(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>节点验证</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10" 
                      value={formScore3} 
                      onChange={(e) => setFormScore3(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>结构概括</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="10" 
                      value={formScore4} 
                      onChange={(e) => setFormScore4(e.target.value)} 
                    />
                  </div>
                </div>

                <h5 className="section-divider">📈 综合表现属性</h5>

                <div className="form-row">
                  <div className="form-group">
                    <label>完成时间 (分)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="120" 
                      value={formTime} 
                      onChange={(e) => setFormTime(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>焦虑水平 (1-5)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="5" 
                      value={formAnxiety} 
                      onChange={(e) => setFormAnxiety(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>元认知水平</label>
                    <select value={formMeta} onChange={(e) => setFormMeta(e.target.value)}>
                      {META_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>角色偏好</label>
                    <select value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                      {ROLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>参与主动性 (1-10)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="10" 
                      value={formParticipation} 
                      onChange={(e) => setFormParticipation(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>协作指数 (1-10)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="1" 
                      max="10" 
                      value={formCollaboration} 
                      onChange={(e) => setFormCollaboration(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-action-buttons">
                  <button type="submit" className="data-btn primary-form">
                    {selectedStudent ? "确认修改" : "添加至列表"}
                  </button>
                  {selectedStudent && (
                    <button type="button" className="data-btn secondary" onClick={handleClearForm}>
                      取消编辑
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="data-modal-footer">
          <button className="data-btn secondary" onClick={onClose}>
            关闭窗口 (不保存)
          </button>
          <button className="data-btn primary" onClick={handleApply}>
            💾 保存并应用当前数据
          </button>
        </div>
      </div>
    </div>
  );
}
