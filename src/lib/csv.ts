import { type AttendanceRecord, type AttendanceSession } from "./storage";

export const exportSessionsToCSV = (
  sessions: AttendanceSession[],
  getRecords: (sessionId: string) => AttendanceRecord[]
) => {
  const rows: string[][] = [["Date", "Time", "Session Code", "Student Name", "Signed At"]];

  for (const s of sessions) {
    const records = getRecords(s.id);
    if (records.length === 0) {
      rows.push([
        new Date(s.createdAt).toLocaleDateString(),
        new Date(s.createdAt).toLocaleTimeString(),
        s.code,
        "(no students)",
        "",
      ]);
    } else {
      for (const r of records) {
        rows.push([
          new Date(s.createdAt).toLocaleDateString(),
          new Date(s.createdAt).toLocaleTimeString(),
          s.code,
          r.studentName,
          new Date(r.signedAt).toLocaleTimeString(),
        ]);
      }
    }
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
