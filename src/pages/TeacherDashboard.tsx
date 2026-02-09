import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  createSession,
  getActiveSession,
  getSessions,
  getRecordsForSession,
  type AttendanceSession,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Plus, Clock, Users, ChevronRight } from "lucide-react";

const formatTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [active, setActive] = useState<AttendanceSession | undefined>(getActiveSession());
  const [remaining, setRemaining] = useState(0);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState(getSessions());

  const refresh = useCallback(() => {
    const a = getActiveSession();
    setActive(a);
    setSessions(getSessions());
    if (a) setRemaining(a.expiresAt - Date.now());
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const r = active.expiresAt - Date.now();
      if (r <= 0) {
        setRemaining(0);
        setActive(undefined);
        setSessions(getSessions());
      } else {
        setRemaining(r);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [active]);

  const startSession = (minutes: number) => {
    if (!user) return;
    const s = createSession(user.id, minutes);
    setActive(s);
    setRemaining(s.expiresAt - Date.now());
    setSessions(getSessions());
  };

  const selectedRecords = selectedSession ? getRecordsForSession(selectedSession) : [];
  const selectedSessionData = selectedSession ? sessions.find((s) => s.id === selectedSession) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Teacher Dashboard</h1>
          <p className="text-xs text-muted-foreground">Hi, {user?.name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Active Session */}
        {active ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Active Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Attendance Code</p>
                <p className="text-5xl font-mono font-bold tracking-[0.3em] text-primary">
                  {active.code}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Time Remaining</p>
                <p className={`text-2xl font-mono font-bold ${remaining < 30000 ? "text-destructive" : "text-foreground"}`}>
                  {formatTime(remaining)}
                </p>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {getRecordsForSession(active.id).length} student(s) signed
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Start Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Choose session duration:</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 5].map((m) => (
                  <Button key={m} onClick={() => startSession(m)} className="text-base h-12">
                    {m} min
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Detail View */}
        {selectedSession && selectedSessionData ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Session Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
                  Back
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedSessionData.createdAt).toLocaleString()} · Code: {selectedSessionData.code}
              </p>
            </CardHeader>
            <CardContent>
              {selectedRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No students signed in.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedRecords.map((r) => (
                    <li key={r.studentId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="font-medium text-sm">{r.studentName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.signedAt).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Session History */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Session History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No sessions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {[...sessions].reverse().map((s) => {
                    const count = getRecordsForSession(s.id).length;
                    const expired = s.expiresAt <= Date.now();
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedSession(s.id)}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(s.createdAt).toLocaleDateString()}{" "}
                            <span className="text-muted-foreground font-normal">
                              {new Date(s.createdAt).toLocaleTimeString()}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {count} student{count !== 1 && "s"} · {expired ? "Expired" : "Active"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
