import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Plus, Clock, Users, ChevronRight, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Session {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  teacher_id: string;
}

interface Record {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  signed_at: string;
}

const formatTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const generateCode = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [active, setActive] = useState<Session | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Record[]>([]);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setSessions(data as Session[]);
      const now = new Date().toISOString();
      const activeSession = (data as Session[]).find(s => s.expires_at > now);
      setActive(activeSession || null);
    }
  }, [user]);

  const fetchLiveCount = useCallback(async () => {
    if (!active) return;
    const { count } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("session_id", active.id);
    setLiveCount(count || 0);
  }, [active]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Poll for live count
  useEffect(() => {
    if (!active) return;
    fetchLiveCount();
    const interval = setInterval(fetchLiveCount, 2000);
    return () => clearInterval(interval);
  }, [active, fetchLiveCount]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`records-${active.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "attendance_records",
        filter: `session_id=eq.${active.id}`,
      }, () => {
        fetchLiveCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active, fetchLiveCount]);

  // Countdown timer
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const r = new Date(active.expires_at).getTime() - Date.now();
      if (r <= 0) {
        setRemaining(0);
        setActive(null);
        fetchSessions();
      } else {
        setRemaining(r);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [active, fetchSessions]);

  const startSession = async (minutes: number) => {
    if (!user) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);
    const code = generateCode();

    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({
        code,
        expires_at: expiresAt.toISOString(),
        teacher_id: user.id,
      })
      .select()
      .single();

    if (data && !error) {
      setActive(data as Session);
      setRemaining(minutes * 60 * 1000);
      setLiveCount(0);
      fetchSessions();
    }
  };

  const fetchSelectedRecords = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("session_id", sessionId)
      .order("signed_at", { ascending: true });
    setSelectedRecords((data as Record[]) || []);
  }, []);

  useEffect(() => {
    if (selectedSession) fetchSelectedRecords(selectedSession);
  }, [selectedSession, fetchSelectedRecords]);

  const exportCSV = async () => {
    // Fetch all records for all sessions
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) return;

    const { data: records } = await supabase
      .from("attendance_records")
      .select("*")
      .in("session_id", sessionIds);

    if (!records || records.length === 0) return;

    const header = "Session Date,Session Code,Student Name,Signed At\n";
    const rows = (records as Record[]).map(r => {
      const session = sessions.find(s => s.id === r.session_id);
      return `"${session ? new Date(session.created_at).toLocaleString() : ""}","${session?.code || ""}","${r.student_name}","${new Date(r.signed_at).toLocaleString()}"`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedSessionData = selectedSession ? sessions.find(s => s.id === selectedSession) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Teacher Dashboard</h1>
          <p className="text-xs text-muted-foreground">Hi, {user?.name}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={exportCSV} title="Export CSV">
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
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
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={active.code} size={160} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Time Remaining</p>
                <p className={`text-2xl font-mono font-bold ${remaining < 30000 ? "text-destructive" : "text-foreground"}`}>
                  {formatTime(remaining)}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-lg font-bold text-primary">{liveCount}</span>
                <span className="text-sm text-muted-foreground">student{liveCount !== 1 && "s"} signed</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </div>
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

        {selectedSession && selectedSessionData ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Session Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>Back</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedSessionData.created_at).toLocaleString()} · Code: {selectedSessionData.code}
              </p>
            </CardHeader>
            <CardContent>
              {selectedRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No students signed in.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedRecords.map((r) => (
                    <li key={r.student_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <span className="font-medium text-sm">{r.student_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.signed_at).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : (
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
                  {sessions.map((s) => {
                    const expired = new Date(s.expires_at) <= new Date();
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedSession(s.id)}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(s.created_at).toLocaleDateString()}{" "}
                            <span className="text-muted-foreground font-normal">{new Date(s.created_at).toLocaleTimeString()}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{expired ? "Expired" : "Active"}</p>
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
