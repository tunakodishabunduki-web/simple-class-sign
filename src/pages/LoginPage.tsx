import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

const LoginPage = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, role, displayName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ClipboardCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Attendance</CardTitle>
          <CardDescription>
            {isRegister ? "Create a new account" : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={role === "student" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setRole("student")}
                  >
                    Student
                  </Button>
                  <Button
                    type="button"
                    variant={role === "teacher" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setRole("teacher")}
                  >
                    Teacher
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <Button type="submit" className="w-full text-base h-11" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => { setIsRegister(!isRegister); setError(""); }}
              >
                {isRegister ? "Sign In" : "Register"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
