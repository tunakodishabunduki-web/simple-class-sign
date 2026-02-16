// Types
export interface User {
  id: string;
  name: string;
  password: string;
  role: "teacher" | "student";
}

export interface AttendanceSession {
  id: string;
  code: string;
  createdAt: number; // timestamp
  expiresAt: number; // timestamp
  teacherId: string;
}

export interface AttendanceRecord {
  sessionId: string;
  studentId: string;
  studentName: string;
  signedAt: number; // timestamp
  deviceFingerprint?: string;
}

// Helpers
const get = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const set = (key: string, value: unknown) =>
  localStorage.setItem(key, JSON.stringify(value));

// Users
export const getUsers = (): User[] => get("att_users", []);

export const registerUser = (name: string, password: string, role: "teacher" | "student"): User => {
  const users = getUsers();
  const exists = users.find((u) => u.name === name);
  if (exists) throw new Error("Username already taken");
  const user: User = { id: crypto.randomUUID(), name, password, role };
  set("att_users", [...users, user]);
  return user;
};

export const loginUser = (name: string, password: string): User => {
  const user = getUsers().find((u) => u.name === name && u.password === password);
  if (!user) throw new Error("Invalid name or password");
  return user;
};

// Sessions
export const getSessions = (): AttendanceSession[] => get("att_sessions", []);

const generateCode = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

export const createSession = (teacherId: string, durationMinutes: number): AttendanceSession => {
  const now = Date.now();
  const session: AttendanceSession = {
    id: crypto.randomUUID(),
    code: generateCode(),
    createdAt: now,
    expiresAt: now + durationMinutes * 60 * 1000,
    teacherId,
  };
  set("att_sessions", [...getSessions(), session]);
  return session;
};

export const getActiveSession = (): AttendanceSession | undefined =>
  getSessions().find((s) => s.expiresAt > Date.now());

// Attendance records
export const getRecords = (): AttendanceRecord[] => get("att_records", []);

export const signAttendance = (code: string, studentId: string, studentName: string, deviceFingerprint?: string): void => {
  const session = getSessions().find((s) => s.code === code);
  if (!session) throw new Error("Invalid attendance code");
  if (session.expiresAt <= Date.now()) throw new Error("This attendance code has expired");

  const records = getRecords();
  const already = records.find((r) => r.sessionId === session.id && r.studentId === studentId);
  if (already) throw new Error("You already signed this session");

  // Check device fingerprint - prevent same device for different students
  if (deviceFingerprint) {
    const deviceUsed = records.find(
      (r) => r.sessionId === session.id && r.deviceFingerprint === deviceFingerprint && r.studentId !== studentId
    );
    if (deviceUsed) throw new Error("This device was already used by another student for this session");
  }

  set("att_records", [...records, { sessionId: session.id, studentId, studentName, signedAt: Date.now(), deviceFingerprint }]);
};

export const getRecordsForSession = (sessionId: string): AttendanceRecord[] =>
  getRecords().filter((r) => r.sessionId === sessionId);

export const getRecordsForStudent = (studentId: string): AttendanceRecord[] =>
  getRecords().filter((r) => r.studentId === studentId);
