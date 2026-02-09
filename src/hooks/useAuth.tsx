import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { loginUser, registerUser, type User } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string) => void;
  register: (name: string, password: string, role: "teacher" | "student") => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem("att_current_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((name: string, password: string) => {
    const u = loginUser(name, password);
    localStorage.setItem("att_current_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback((name: string, password: string, role: "teacher" | "student") => {
    const u = registerUser(name, password, role);
    localStorage.setItem("att_current_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("att_current_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
