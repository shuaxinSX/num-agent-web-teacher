import { students as defaultStudents } from '../data/groupingData';
import { buildMockStudentDataset } from '../data/lagrangeTeacherMockData';

const STORAGE_KEY = 'num-agent-custom-students';

export function maskName(name) {
  if (!name) return "";
  if (name.length <= 1) return name;
  if (name.length === 2) {
    return name[0] + "*";
  }
  return name[0] + "*" + name.slice(2);
}

export function assignStudentType(scores) {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 8.5) return 'A';
  if (avg >= 7.5) return 'B';
  if (avg >= 6.0) return 'D';
  if (avg >= 4.5) return 'E';
  return 'C';
}

export function getStoredStudents() {
  if (typeof window === 'undefined') {
    return defaultStudents;
  }
  
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load custom students from localStorage:', error);
  }

  // Fallback to anonymized default students
  return defaultStudents.map(s => ({
    ...s,
    name: maskName(s.name)
  }));
}

export function saveStudents(studentsList) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(studentsList));
  } catch (error) {
    console.error('Failed to save custom students to localStorage:', error);
  }
}

export function resetStudents() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset custom students in localStorage:', error);
  }
  return getStoredStudents();
}

export function parseCSVText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const importedList = [];
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
  return importedList;
}

// ===== Teacher Feedback & Lagrange Diagnostic Dataset Storage =====
const LAGRANGE_STORAGE_KEY = 'num-agent-lagrange-students-v2';

export function getStoredLagrangeDashboardStudents() {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(LAGRANGE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load lagrange students from localStorage:', error);
  }
  return buildMockStudentDataset();
}

export function saveLagrangeDashboardStudents(studentsList) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAGRANGE_STORAGE_KEY, JSON.stringify(studentsList));
  } catch (error) {
    console.error('Failed to save lagrange students to localStorage:', error);
  }
}

export function resetLagrangeDashboardStudents() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAGRANGE_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset lagrange students:', error);
  }
  return buildMockStudentDataset();
}


