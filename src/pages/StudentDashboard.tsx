import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { signAttendance, getRecordsForStudent, getSessions } from "@/lib/storage";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, CheckCircle2, XCircle, History } from "lucide-react";
import QrScanner from "@/components/QrScanner";

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [myRecords, setMyRecords] = useState(user ? getRecordsForStudent(user.id) : []);
  const sessions = getSessions();

  // Auto-refresh records every 5 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      setMyRecords(getRecordsForStudent(user.id));
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const submitCode = (value: string) => {
    if (!user) return;
    setFeedback(null);
    try {
      const fingerprint = getDeviceFingerprint();
      signAttendance(value.trim(), user.id, user.name, fingerprint);
      setFeedback({ type: "success", msg: "Attendance signed successfully!" });
      setCode("");
      setMyRecords(getRecordsForStudent(user.id));
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
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
      {/* Header */}
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
        {/* Sign Attendance */}
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
              <Button type="submit" className="w-full h-12 text-base">
                Submit
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
                    ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
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

        {/* Attendance History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> My Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No attendance records yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {[...myRecords].reverse().map((r) => {
                  const session = sessions.find((s) => s.id === r.sessionId);
                  return (
                    <li key={r.sessionId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(r.signedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Signed at {new Date(r.signedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {session?.code ?? "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
