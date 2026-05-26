import React, { useState, useRef, useEffect } from "react";
import { 
  getStoredStudents, 
  saveStudents, 
  resetStudents, 
  assignStudentType,
  getStoredLagrangeDashboardStudents,
  saveLagrangeDashboardStudents,
  resetLagrangeDashboardStudents
} from "../utils/studentDataStore";
import { ROLE_OPTIONS, META_OPTIONS } from "../data/groupingData";
import "./DataManagementModal.css";

// mode can be: 'collection' | 'grouping' | 'lagrange-feedback' | 'teacher-dashboard' | 'evaluation'
export function DataManagementModal({ isOpen, onClose, onDataChanged, mode = "grouping" }) {
  const isLagrangeMode = mode === "teacher-dashboard" || mode === "lagrange-feedback";
  
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Base Student Form State
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formGender, setFormGender] = useState("男");
  const [formDorm, setFormDorm] = useState("6#301");
  const [formSubmitted, setFormSubmitted] = useState(true);

  // Mode: Collection Fields
  const [formScore1, setFormScore1] = useState(8.0);
  const [formScore2, setFormScore2] = useState(8.0);
  const [formScore3, setFormScore3] = useState(8.0);
  const [formScore4, setFormScore4] = useState(8.0);
  const [formTime, setFormTime] = useState(15);
  const [formAnxiety, setFormAnxiety] = useState(2);
  const [formMeta, setFormMeta] = useState("知道");

  // Mode: Grouping Fields
  const [formRole, setFormRole] = useState("计算");
  const [formParticipation, setFormParticipation] = useState(8.0);
  const [formCollaboration, setFormCollaboration] = useState(8.0);

  // Mode: Lagrange Feedback Fields
  const [formLagrangeBasis, setFormLagrangeBasis] = useState("correct");
  const [formLagrangeRunge, setFormLagrangeRunge] = useState("global-sensitive");
  const [formLagrangeTransfer, setFormLagrangeTransfer] = useState("optimize-or-piecewise");
  const [formLagrangeReasonScore, setFormLagrangeReasonScore] = useState(8.0);
  const [formLagrangeTipScore, setFormLagrangeTipScore] = useState(8.0);
  const [formLagrangeConfidence, setFormLagrangeConfidence] = useState("比较有把握");
  const [formLagrangeAnxiety, setFormLagrangeAnxiety] = useState("略有压力");

  // Mode: Teacher Dashboard Fields
  const [formDiagObjective, setFormDiagObjective] = useState(8.0);
  const [formDiagProcess, setFormDiagProcess] = useState(7.5);
  const [formDiagExplanation, setFormDiagExplanation] = useState(7.0);
  const [formDiagDiagnosis, setFormDiagDiagnosis] = useState("会套");
  const [formDiagRisk, setFormDiagRisk] = useState(30);
  const [formDiagQuality, setFormDiagQuality] = useState("高质量");
  const [formDiagComment, setFormDiagComment] = useState("");

  // Mode: Evaluation Fields
  const [formEvalCognition, setFormEvalCognition] = useState(8.0);
  const [formEvalCollaboration, setFormEvalCollaboration] = useState(8.0);
  const [formEvalMotivation, setFormEvalMotivation] = useState(8.0);
  const [formEvalReflection, setFormEvalReflection] = useState(8.0);
  const [formEvalEfficiency, setFormEvalEfficiency] = useState(8.0);

  const fileInputRef = useRef(null);

  // Load students dataset when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      const data = isLagrangeMode ? getStoredLagrangeDashboardStudents() : getStoredStudents();
      setStudentsList(data);
      handleClearForm();
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setFormId(s.id || s.studentId || "");
    setFormName(s.name || "");
    setFormGender(s.gender || "男");
    setFormDorm(s.dorm || "6#301");
    setFormSubmitted(s.submitted !== false);

    if (mode === "collection") {
      setFormScore1(s.scores?.[0] ?? 8.0);
      setFormScore2(s.scores?.[1] ?? 8.0);
      setFormScore3(s.scores?.[2] ?? 8.0);
      setFormScore4(s.scores?.[3] ?? 8.0);
      setFormTime(s.time ?? 15);
      setFormAnxiety(s.anxiety ?? 2);
      setFormMeta(s.meta ?? "知道");
    } else if (mode === "grouping") {
      setFormRole(s.role ?? "计算");
      setFormParticipation(s.participation ?? 8.0);
      setFormCollaboration(s.collaboration ?? 8.0);
    } else if (mode === "lagrange-feedback") {
      const rec = s.record || {};
      setFormLagrangeBasis(rec.rawForm?.practice?.basis || "correct");
      setFormLagrangeRunge(rec.rawForm?.practice?.runge || "global-sensitive");
      setFormLagrangeTransfer(rec.rawForm?.practice?.transfer || "optimize-or-piecewise");
      setFormLagrangeReasonScore(rec.meta?.reasonScore ?? 8.0);
      setFormLagrangeTipScore(rec.meta?.tipScore ?? 8.0);
      setFormLagrangeConfidence(rec.rawForm?.selfReport?.confidence || "比较有把握");
      setFormLagrangeAnxiety(rec.rawForm?.selfReport?.anxiety || "略有压力");
    } else if (mode === "teacher-dashboard") {
      const rec = s.record || {};
      setFormDiagObjective(rec.evidenceScores?.resultEvidence ?? s.averageDimension ?? 8.0);
      setFormDiagProcess(rec.evidenceScores?.processEvidence ?? 7.5);
      setFormDiagExplanation(rec.evidenceScores?.explanationEvidence ?? 7.0);
      setFormDiagDiagnosis(s.diagnosis || "会套");
      setFormDiagRisk(s.riskScore ?? 35);
      setFormDiagQuality(s.qualityBand || "高质量");
      setFormDiagComment(s.teacherActionShort || "");
    } else if (mode === "evaluation") {
      // If we are editing evaluation view, pull from s.scores, s.collaboration, etc.
      // or s.dims directly if evaluation students have them.
      setFormEvalCognition(s.scores ? (s.scores.reduce((a, b) => a + b, 0) / 4) : 8.0);
      setFormEvalCollaboration(s.collaboration ?? 8.0);
      setFormEvalMotivation(s.participation ?? 8.0);
      setFormEvalReflection(s.anxiety ? (6 - s.anxiety) * 2 : 8.0); // mapped anxiety to reflection index
      setFormEvalEfficiency(s.time ? Math.max(10 - s.time / 6, 2) : 8.0); // mapped time to efficiency index
    }
  };

  const handleClearForm = () => {
    setSelectedStudent(null);
    setFormId("");
    setFormName("");
    setFormGender("男");
    setFormDorm("6#301");
    setFormSubmitted(true);

    // Reset fields
    setFormScore1(8.0);
    setFormScore2(8.0);
    setFormScore3(8.0);
    setFormScore4(8.0);
    setFormTime(15);
    setFormAnxiety(2);
    setFormMeta("知道");
    setFormRole("计算");
    setFormParticipation(8.0);
    setFormCollaboration(8.0);
    setFormLagrangeBasis("correct");
    setFormLagrangeRunge("global-sensitive");
    setFormLagrangeTransfer("optimize-or-piecewise");
    setFormLagrangeReasonScore(8.0);
    setFormLagrangeTipScore(8.0);
    setFormLagrangeConfidence("比较有把握");
    setFormLagrangeAnxiety("略有压力");
    setFormDiagObjective(8.0);
    setFormDiagProcess(7.5);
    setFormDiagExplanation(7.0);
    setFormDiagDiagnosis("会套");
    setFormDiagRisk(30);
    setFormDiagQuality("高质量");
    setFormDiagComment("");
    setFormEvalCognition(8.0);
    setFormEvalCollaboration(8.0);
    setFormEvalMotivation(8.0);
    setFormEvalReflection(8.0);
    setFormEvalEfficiency(8.0);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formId || !formName) {
      alert("学号和姓名不能为空！");
      return;
    }

    let studentData = { ...selectedStudent };

    if (mode === "collection") {
      const scores = [
        parseFloat(formScore1) || 0,
        parseFloat(formScore2) || 0,
        parseFloat(formScore3) || 0,
        parseFloat(formScore4) || 0
      ];
      studentData = {
        ...studentData,
        id: formId,
        studentId: formId,
        name: formName,
        gender: formGender,
        dorm: formDorm,
        scores,
        time: parseInt(formTime) || 15,
        anxiety: parseInt(formAnxiety) || 2,
        meta: formMeta,
        type: assignStudentType(scores)
      };
    } else if (mode === "grouping") {
      studentData = {
        ...studentData,
        id: formId,
        studentId: formId,
        name: formName,
        gender: formGender,
        dorm: formDorm,
        role: formRole,
        participation: parseFloat(formParticipation) || 8.0,
        collaboration: parseFloat(formCollaboration) || 8.0
      };
    } else if (mode === "lagrange-feedback" || mode === "teacher-dashboard") {
      // Build Lagrange format data structure
      const basisMap = {
        correct: { score: 9.2, label: "构造能力" },
        "linear-only": { score: 5.3, label: "构造能力" },
        l0: { score: 4.8, label: "构造能力" },
        "wrong-denominator": { score: 4.2, label: "构造能力" }
      };

      const base = basisMap[formLagrangeBasis] || { score: 9.2, label: "构造能力" };
      const dimScores = {
        construct: mode === "teacher-dashboard" ? parseFloat(formDiagObjective) : base.score,
        property: mode === "teacher-dashboard" ? parseFloat(formDiagExplanation) : parseFloat(formLagrangeReasonScore),
        runge: mode === "teacher-dashboard" ? parseFloat(formDiagProcess) : (formLagrangeRunge === "global-sensitive" ? 8.9 : 4.7),
        transfer: formLagrangeTransfer === "optimize-or-piecewise" ? 9.0 : 4.6
      };
      
      const record = {
        submittedAtLabel: selectedStudent?.record?.submittedAtLabel || "10:15",
        elapsedLabel: `${formTime}分00秒`,
        averageDimension: parseFloat(((dimScores.construct + dimScores.property + dimScores.runge + dimScores.transfer) / 4).toFixed(1)),
        dimensionScores: dimScores,
        evidenceScores: {
          resultEvidence: parseFloat(formDiagObjective) || 8.0,
          processEvidence: parseFloat(formDiagProcess) || 7.5,
          explanationEvidence: parseFloat(formDiagExplanation) || 7.0
        },
        diagnosis: formDiagDiagnosis,
        quality: {
          score: formDiagQuality === "高质量" ? 95 : formDiagQuality === "基本可用" ? 75 : 50,
          band: formDiagQuality,
          weight: formDiagQuality === "高质量" ? 1.0 : formDiagQuality === "基本可用" ? 0.7 : 0.4,
          flags: []
        },
        teacherAction: `建议重点强化诊断出的“${formDiagDiagnosis}”标签。`,
        directData: [
          { label: "学习信心", value: `${formLagrangeConfidence}` },
          { label: "焦虑感", value: `${formLagrangeAnxiety}` }
        ],
        behaviorData: [
          { label: "完成时间", value: `${formTime}分钟` }
        ],
        practiceResults: [],
        derivedData: [],
        rawForm: {
          selfReport: { confidence: formLagrangeConfidence, anxiety: formLagrangeAnxiety },
          practice: { basis: formLagrangeBasis, runge: formLagrangeRunge, transfer: formLagrangeTransfer }
        },
        meta: {
          reasonScore: parseFloat(formLagrangeReasonScore),
          tipScore: parseFloat(formLagrangeTipScore)
        }
      };

      studentData = {
        ...studentData,
        id: formId,
        studentId: formId,
        name: formName,
        submitted: formSubmitted,
        riskScore: parseInt(formDiagRisk) || 30,
        riskBand: formDiagRisk >= 80 ? "高" : formDiagRisk >= 60 ? "中" : "低",
        diagnosis: formDiagDiagnosis,
        qualityBand: formDiagQuality,
        teacherActionShort: formDiagComment || `${formDiagDiagnosis} · 需要关注`,
        record: formSubmitted ? record : null
      };
    } else if (mode === "evaluation") {
      // Evaluation mode: map values back to underlying student fields
      studentData = {
        ...studentData,
        id: formId,
        studentId: formId,
        name: formName,
        gender: formGender,
        dorm: formDorm,
        scores: [
          parseFloat(formEvalCognition),
          parseFloat(formEvalCognition),
          parseFloat(formEvalCognition),
          parseFloat(formEvalCognition)
        ],
        collaboration: parseFloat(formEvalCollaboration),
        participation: parseFloat(formEvalMotivation),
        anxiety: Math.max(1, Math.round(6 - formEvalReflection / 2)), // reverse map reflection to anxiety
        time: Math.round((10 - formEvalEfficiency) * 6) // reverse map efficiency to completion time
      };
    }

    if (selectedStudent) {
      // Update
      const sId = selectedStudent.id || selectedStudent.studentId;
      const newList = studentsList.map(s => (s.id === sId || s.studentId === sId) ? studentData : s);
      setStudentsList(newList);
    } else {
      // Insert
      const exists = studentsList.some(s => s.id === formId || s.studentId === formId);
      if (exists) {
        alert("该学号已存在！");
        return;
      }
      setStudentsList([...studentsList, studentData]);
    }
    handleClearForm();
  };

  const handleDeleteStudent = (sId) => {
    if (confirm("确定要删除该学生的数据吗？")) {
      const newList = studentsList.filter(s => s.id !== sId && s.studentId !== sId);
      setStudentsList(newList);
      if (selectedStudent && (selectedStudent.id === sId || selectedStudent.studentId === sId)) {
        handleClearForm();
      }
    }
  };

  const handleApply = () => {
    if (isLagrangeMode) {
      saveLagrangeDashboardStudents(studentsList);
    } else {
      saveStudents(studentsList);
    }
    onDataChanged(studentsList);
    onClose();
  };

  const handleReset = () => {
    if (confirm(`确定要恢复系统默认的“${mode === "teacher-dashboard" || mode === "lagrange-feedback" ? "课后反馈" : "课前学情"}”数据吗？这会清除您本地的所有修改。`)) {
      const defaultList = isLagrangeMode ? resetLagrangeDashboardStudents() : resetStudents();
      setStudentsList(defaultList);
      handleClearForm();
    }
  };

  const downloadCSVTemplate = () => {
    let headers = "";
    let example = "";
    
    if (mode === "collection") {
      headers = "学号,姓名,性别,基函数得分(0-10),分式运算得分(0-10),节点验证得分(0-10),结构概括得分(0-10),完成时间(分),焦虑感(1-5),元认知\n";
      example = "2023210781,张*伟,男,8.5,8.0,7.5,9.0,18,2,知道\n";
    } else if (mode === "grouping") {
      headers = "学号,姓名,性别,宿舍,角色偏好,参与主动性(1-10),协作合作指数(1-10)\n";
      example = "2023210782,李*娜,女,3#202,讲解,9.0,8.5\n";
    } else if (mode === "lagrange-feedback") {
      headers = "学号,姓名,是否提交(y/n),构造结果(correct/l0/linear-only/wrong-denominator),龙格认知(global-sensitive/condition-fails),迁移理解(optimize-or-piecewise/higher-global),说理得分(0-10),自评信心(1-5)\n";
      example = "2023210783,林*夏,y,correct,global-sensitive,optimize-or-piecewise,8.5,4\n";
    } else if (mode === "teacher-dashboard") {
      headers = "学号,姓名,是否提交(y/n),客观成绩(0-10),过程表现(0-10),解释理解(0-10),诊断标签(真懂/会套/猜对/基础待补),预警风险(12-99),指导行动建议\n";
      example = "2023210784,韩*妍,y,5.3,6.2,4.8,基础待补,75,强化基函数构造基础与节点概念\n";
    } else if (mode === "evaluation") {
      headers = "学号,姓名,认知理解(0-10),团队协作(0-10),学习动力(0-10),反思能力(0-10),时间效率(0-10)\n";
      example = "2023210785,白*川,8.5,9.0,7.5,8.0,8.5\n";
    }

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), headers + example], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `学生数据管理模板-${mode}.csv`);
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
        alert("导入失败：CSV 文件格式错误或数据为空。");
        return;
      }

      const importedList = [];
      try {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
          const id = cols[0];
          const name = cols[1];
          if (!id || !name) continue;

          if (mode === "collection") {
            const scores = [
              parseFloat(cols[3]) || 8.0,
              parseFloat(cols[4]) || 8.0,
              parseFloat(cols[5]) || 8.0,
              parseFloat(cols[6]) || 8.0
            ];
            importedList.push({
              id, studentId: id, name, gender: cols[2] || "男", dorm: "6#301",
              scores, time: parseInt(cols[7]) || 15, anxiety: parseInt(cols[8]) || 2,
              meta: cols[9] || "知道", type: assignStudentType(scores)
            });
          } else if (mode === "grouping") {
            importedList.push({
              id, studentId: id, name, gender: cols[2] || "男", dorm: cols[3] || "6#301",
              role: cols[4] || "计算", participation: parseFloat(cols[5]) || 8.0,
              collaboration: parseFloat(cols[6]) || 8.0
            });
          } else if (mode === "lagrange-feedback" || mode === "teacher-dashboard") {
            const submitted = (cols[2] || "y").toLowerCase() === "y";
            const score1 = parseFloat(cols[3]) || 8.0;
            const score2 = parseFloat(cols[4]) || 7.5;
            const score3 = parseFloat(cols[5]) || 7.0;
            const diagnosis = cols[6] || "会套";
            const riskScore = parseInt(cols[7]) || 35;
            const quality = cols[8] || "高质量";

            importedList.push({
              id, studentId: id, name, submitted, riskScore,
              riskBand: riskScore >= 80 ? "高" : riskScore >= 60 ? "中" : "低",
              diagnosis, qualityBand: quality, teacherActionShort: cols[9] || `${diagnosis} · 待跟进`,
              record: submitted ? {
                submittedAtLabel: "10:15",
                elapsedLabel: "15分00秒",
                averageDimension: score1,
                dimensionScores: { construct: score1, property: score3, runge: score2, transfer: score2 },
                evidenceScores: { resultEvidence: score1, processEvidence: score2, explanationEvidence: score3 },
                diagnosis,
                quality: { score: 90, band: quality, weight: 1.0, flags: [] },
                teacherAction: "CSV 导入后分配的诊断行动建议。",
                directData: [{ label: "角色偏好", value: "验证" }],
                behaviorData: [{ label: "修改次数", value: "3 次" }],
                practiceResults: [], derivedData: [], rawForm: {}, meta: {}
              } : null
            });
          } else if (mode === "evaluation") {
            const s = [
              parseFloat(cols[2]) || 8.0,
              parseFloat(cols[2]) || 8.0,
              parseFloat(cols[2]) || 8.0,
              parseFloat(cols[2]) || 8.0
            ];
            importedList.push({
              id, studentId: id, name, gender: "男", dorm: "6#301",
              scores: s,
              collaboration: parseFloat(cols[3]) || 8.0,
              participation: parseFloat(cols[4]) || 8.0,
              anxiety: Math.max(1, Math.round(6 - (parseFloat(cols[5]) || 8.0) / 2)),
              time: Math.round((10 - (parseFloat(cols[6]) || 8.0)) * 6)
            });
          }
        }
        setStudentsList(importedList);
        alert(`成功导入 ${importedList.length} 条学生数据！请点击底部的“保存并应用”生效。`);
      } catch (err) {
        alert("导入解析失败，请检查 CSV 文件是否符合模板结构。");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const getModeTitle = () => {
    switch(mode) {
      case "collection": return "📋 课前自学与答题数据管理";
      case "grouping": return "🧩 课前分组特征数据管理";
      case "lagrange-feedback": return "📝 学生课后反馈详情管理";
      case "teacher-dashboard": return "📊 班级数值诊断数据源管理";
      case "evaluation": return "🎯 学生五维画像数字评分管理";
      default: return "📁 教学诊断数据源管理";
    }
  };

  return (
    <div className="data-modal-overlay">
      <div className="data-modal-box">
        <div className="data-modal-header">
          <h3>{getModeTitle()}</h3>
          <button className="data-modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="data-modal-body">
          {/* Action Toolbar */}
          <div className="data-actions-toolbar">
            <button className="data-btn secondary" onClick={downloadCSVTemplate}>
              📥 下载专属 CSV 模板
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
              🔄 恢复该页默认数据
            </button>
          </div>

          <div className="data-workspace-grid">
            {/* List Section */}
            <div className="data-list-section">
              <h4>名单列表 ({studentsList.length} 人)</h4>
              <div className="data-table-container">
                <table className="data-students-table">
                  <thead>
                    <tr>
                      <th>学号</th>
                      <th>姓名</th>
                      {mode === "collection" && <th>课前均分</th>}
                      {mode === "collection" && <th>用时(分)</th>}
                      {mode === "grouping" && <th>宿舍</th>}
                      {mode === "grouping" && <th>合作度</th>}
                      {mode === "lagrange-feedback" && <th>提交</th>}
                      {mode === "lagrange-feedback" && <th>信心</th>}
                      {mode === "teacher-dashboard" && <th>诊断标签</th>}
                      {mode === "teacher-dashboard" && <th>风险</th>}
                      {mode === "evaluation" && <th>认知分</th>}
                      {mode === "evaluation" && <th>协作分</th>}
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map((s) => {
                      const sId = s.id || s.studentId;
                      const isSelected = selectedStudent && (selectedStudent.id === sId || selectedStudent.studentId === sId);
                      
                      // Values mapping for quick display
                      let columnVal1 = "";
                      let columnVal2 = "";
                      
                      if (mode === "collection") {
                        columnVal1 = s.scores ? (s.scores.reduce((a, b) => a + b, 0) / 4).toFixed(1) : "8.0";
                        columnVal2 = `${s.time ?? 15}分`;
                      } else if (mode === "grouping") {
                        columnVal1 = s.dorm || "-";
                        columnVal2 = s.collaboration ?? "8.0";
                      } else if (mode === "lagrange-feedback") {
                        columnVal1 = s.submitted !== false ? "✅" : "❌";
                        columnVal2 = s.record?.rawForm?.selfReport?.confidence || "比较有把握";
                      } else if (mode === "teacher-dashboard") {
                        columnVal1 = s.diagnosis || "未提交";
                        columnVal2 = `${s.riskScore ?? 35} (${s.riskBand || "低"})`;
                      } else if (mode === "evaluation") {
                        columnVal1 = s.scores ? (s.scores.reduce((a, b) => a + b, 0) / 4).toFixed(1) : "8.0";
                        columnVal2 = s.collaboration ?? "8.0";
                      }

                      return (
                        <tr 
                          key={sId} 
                          onClick={() => handleSelectStudent(s)}
                          className={isSelected ? "is-selected" : ""}
                        >
                          <td>{sId}</td>
                          <td><strong>{s.name}</strong></td>
                          <td>{columnVal1}</td>
                          {columnVal2 && <td>{columnVal2}</td>}
                          <td>
                            <button 
                              className="data-row-del-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(sId);
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
              <h4>{selectedStudent ? "📝 编辑本页学生数据" : "➕ 新增本页学生数据"}</h4>
              <form onSubmit={handleSaveForm} className="data-student-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>学号</label>
                    <input 
                      type="text" 
                      value={formId} 
                      onChange={(e) => setFormId(e.target.value)} 
                      placeholder="学号 / ID" 
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
                    <label>住宿宿舍</label>
                    <input 
                      type="text" 
                      value={formDorm} 
                      onChange={(e) => setFormDorm(e.target.value)} 
                      placeholder="如 6#301" 
                    />
                  </div>
                </div>

                {/* Sub-form based on mode */}
                {mode === "collection" && (
                  <>
                    <h5 className="section-divider">📋 课前诊断分数 (0–10分)</h5>
                    <div className="form-row">
                      <div className="form-group">
                        <label>基函数构造</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formScore1} onChange={(e) => setFormScore1(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label>分式运算</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formScore2} onChange={(e) => setFormScore2(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>节点验证</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formScore3} onChange={(e) => setFormScore3(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label>结构概括</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formScore4} onChange={(e) => setFormScore4(e.target.value)} 
                        />
                      </div>
                    </div>
                    <h5 className="section-divider">📈 课前表现自填情况</h5>
                    <div className="form-row">
                      <div className="form-group">
                        <label>用时 (分)</label>
                        <input 
                          type="number" min="1" max="120" 
                          value={formTime} onChange={(e) => setFormTime(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label>自学焦虑感 (1-5)</label>
                        <input 
                          type="number" min="1" max="5" 
                          value={formAnxiety} onChange={(e) => setFormAnxiety(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>元认知自评</label>
                        <select value={formMeta} onChange={(e) => setFormMeta(e.target.value)}>
                          {META_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {mode === "grouping" && (
                  <>
                    <h5 className="section-divider">🧩 分组偏好与指数 (1–10分)</h5>
                    <div className="form-row">
                      <div className="form-group">
                        <label>角色偏好</label>
                        <select value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                          {ROLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>参与主动性</label>
                        <input 
                          type="number" step="0.1" min="1" max="10" 
                          value={formParticipation} onChange={(e) => setFormParticipation(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label>合作度指数</label>
                        <input 
                          type="number" step="0.1" min="1" max="10" 
                          value={formCollaboration} onChange={(e) => setFormCollaboration(e.target.value)} 
                        />
                      </div>
                    </div>
                  </>
                )}

                {mode === "lagrange-feedback" && (
                  <>
                    <h5 className="section-divider">📝 课后拉格朗日练习情况</h5>
                    <div className="form-row">
                      <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" checked={formSubmitted} 
                            onChange={(e) => setFormSubmitted(e.target.checked)} 
                          />
                          是否已提交课后作业与问卷
                        </label>
                      </div>
                    </div>
                    
                    {formSubmitted && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label>基函数客观题状态</label>
                            <select value={formLagrangeBasis} onChange={(e) => setFormLagrangeBasis(e.target.value)}>
                              <option value="correct">完全正确 (9.2分)</option>
                              <option value="linear-only">基函数遗漏因子 (5.3分)</option>
                              <option value="l0">概念混淆 (4.8分)</option>
                              <option value="wrong-denominator">公式误用 (4.2分)</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>龙格现象认知</label>
                            <select value={formLagrangeRunge} onChange={(e) => setFormLagrangeRunge(e.target.value)}>
                              <option value="global-sensitive">掌握误差分布 (8.9分)</option>
                              <option value="condition-fails">误差机制误判 (4.7分)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>迁移方法能力</label>
                            <select value={formLagrangeTransfer} onChange={(e) => setFormLagrangeTransfer(e.target.value)}>
                              <option value="optimize-or-piecewise">方法选择正确 (9.0分)</option>
                              <option value="higher-global">方法判断偏差 (4.6分)</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>说理表达得分</label>
                            <input 
                              type="number" step="0.1" min="0" max="10" 
                              value={formLagrangeReasonScore} onChange={(e) => setFormLagrangeReasonScore(e.target.value)} 
                            />
                          </div>
                          <div className="form-group">
                            <label>防错警示得分</label>
                            <input 
                              type="number" step="0.1" min="0" max="10" 
                              value={formLagrangeTipScore} onChange={(e) => setFormLagrangeTipScore(e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>学习信心自评</label>
                            <select value={formLagrangeConfidence} onChange={(e) => setFormLagrangeConfidence(e.target.value)}>
                              <option value="很有把握">很有把握</option>
                              <option value="比较有把握">比较有把握</option>
                              <option value="一般">一般</option>
                              <option value="不太有把握">不太有把握</option>
                              <option value="几乎没把握">几乎没把握</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>自评焦虑感</label>
                            <select value={formLagrangeAnxiety} onChange={(e) => setFormLagrangeAnxiety(e.target.value)}>
                              <option value="很轻松">很轻松</option>
                              <option value="略有压力">略有压力</option>
                              <option value="有点紧张">有点紧张</option>
                              <option value="比较紧张">比较紧张</option>
                              <option value="很紧张">很紧张</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {mode === "teacher-dashboard" && (
                  <>
                    <h5 className="section-divider">📊 课后教学诊断证据链</h5>
                    <div className="form-row">
                      <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" checked={formSubmitted} 
                            onChange={(e) => setFormSubmitted(e.target.checked)} 
                          />
                          学生已提交诊断数据
                        </label>
                      </div>
                    </div>

                    {formSubmitted && (
                      <>
                        <div className="form-row">
                          <div className="form-group">
                            <label>客观题证据分 (0-10)</label>
                            <input 
                              type="number" step="0.1" min="0" max="10" 
                              value={formDiagObjective} onChange={(e) => setFormDiagObjective(e.target.value)} 
                            />
                          </div>
                          <div className="form-group">
                            <label>过程行为证据分 (0-10)</label>
                            <input 
                              type="number" step="0.1" min="0" max="10" 
                              value={formDiagProcess} onChange={(e) => setFormDiagProcess(e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>说理表达证据分 (0-10)</label>
                            <input 
                              type="number" step="0.1" min="0" max="10" 
                              value={formDiagExplanation} onChange={(e) => setFormDiagExplanation(e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>综合诊断标签</label>
                            <select value={formDiagDiagnosis} onChange={(e) => setFormDiagDiagnosis(e.target.value)}>
                              <option value="真懂">真懂 (合格优异)</option>
                              <option value="会套">会套 (机械做题)</option>
                              <option value="猜对">猜对 (概率正确)</option>
                              <option value="校准失衡">校准失衡 (过分自信)</option>
                              <option value="基础待补">基础待补 (需要支架)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>学情预警风险 (12-99)</label>
                            <input 
                              type="number" min="12" max="99" 
                              value={formDiagRisk} onChange={(e) => setFormDiagRisk(e.target.value)} 
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label>数据可信质量等级</label>
                            <select value={formDiagQuality} onChange={(e) => setFormDiagQuality(e.target.value)}>
                              <option value="高质量">高质量</option>
                              <option value="基本可用">基本可用</option>
                              <option value="低可信">低可信</option>
                              <option value="疑似无效">疑似无效</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>教师课后辅导短评与建议</label>
                          <textarea 
                            value={formDiagComment} 
                            onChange={(e) => setFormDiagComment(e.target.value)} 
                            placeholder="请输入具体的辅导反馈..."
                            rows="2"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {mode === "evaluation" && (
                  <>
                    <h5 className="section-divider">🎯 五维综合评价分数 (0-10分)</h5>
                    <div className="form-row">
                      <div className="form-group">
                        <label>认知理解维度</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formEvalCognition} onChange={(e) => setFormEvalCognition(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label>团队协作维度</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formEvalCollaboration} onChange={(e) => setFormEvalCollaboration(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>学习动力维度</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formEvalMotivation} onChange={(e) => setFormEvalMotivation(e.target.value)} 
                        />
                      </div>
                      <div className="form-group">
                        <label>反思元认知维度</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formEvalReflection} onChange={(e) => setFormEvalReflection(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>时间效率维度</label>
                        <input 
                          type="number" step="0.1" min="0" max="10" 
                          value={formEvalEfficiency} onChange={(e) => setFormEvalEfficiency(e.target.value)} 
                        />
                      </div>
                    </div>
                  </>
                )}

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
