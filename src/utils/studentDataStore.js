import { students as defaultStudents } from '../data/groupingData';

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
