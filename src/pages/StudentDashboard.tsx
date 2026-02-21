import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, CheckCircle2, XCircle, History } from "lucide-react";
import QrScanner from "@/components/QrScanner";

interface MyRecord {
  session_id: string;
  signed_at: string;
  session_code?: string;
}

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [myRecords, setMyRecords] = useState<MyRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("attendance_records")
      .select("session_id, signed_at")
      .eq("student_id", user.id)
      .order("signed_at", { ascending: false });

    if (data && data.length > 0) {
      const sessionIds = data.map((r: any) => r.session_id);
      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id, code")
        .in("id", sessionIds);

      const sessionMap = new Map((sessions || []).map((s: any) => [s.id, s.code]));
      setMyRecords(data.map((r: any) => ({
        session_id: r.session_id,
        signed_at: r.signed_at,
        session_code: sessionMap.get(r.session_id) || "—",
      })));
    } else {
      setMyRecords([]);
    }
  }, [user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const submitCode = async (value: string) => {
    if (!user || submitting) return;
    setFeedback(null);
    setSubmitting(true);

    try {
      const trimmed = value.trim();

      // Find session by code
      const { data: session } = await supabase
        .from("attendance_sessions")
        .select("id, expires_at")
        .eq("code", trimmed)
        .single();

      if (!session) throw new Error("Invalid attendance code");
      if (new Date((session as any).expires_at) <= new Date()) throw new Error("This attendance code has expired");

      // Check if already signed
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("session_id", (session as any).id)
        .eq("student_id", user.id)
        .maybeSingle();

      if (existing) throw new Error("You already signed this session");

      // Check device fingerprint
      const fingerprint = getDeviceFingerprint();
      if (fingerprint) {
        const { data: deviceUsed } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("session_id", (session as any).id)
          .eq("device_fingerprint", fingerprint)
          .neq("student_id", user.id)
          .maybeSingle();

        if (deviceUsed) throw new Error("This device was already used by another student for this session");
      }

      const { error } = await supabase
        .from("attendance_records")
        .insert({
          session_id: (session as any).id,
          student_id: user.id,
          student_name: user.name,
          device_fingerprint: fingerprint,
        });

      if (error) throw new Error(error.message);

      setFeedback({ type: "success", msg: "Attendance signed successfully!" });
      setCode("");
      fetchRecords();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(code);
  };

  const handleQrScan = (scannedCode: string) => {
    setCode(scannedCode);
    submitCode(scannedCode);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Student Dashboard</h1>
          <p className="text-xs text-muted-foreground">Hi, {user?.name}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sign Attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-2xl font-mono tracking-[0.3em] h-14"
                required
              />
              <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <QrScanner onScan={handleQrScan} />

            {feedback && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
                  feedback.type === "success"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" />
                )}
                {feedback.msg}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> My Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No attendance records yet.</p>
            ) : (
              <ul className="space-y-2">
                {myRecords.map((r) => (
                  <li key={r.session_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{new Date(r.signed_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Signed at {new Date(r.signed_at).toLocaleTimeString()}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{r.session_code}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
