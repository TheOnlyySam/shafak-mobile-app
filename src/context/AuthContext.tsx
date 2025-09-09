import React, { createContext, useContext, useMemo, useState } from 'react';
import type { User } from '../types';

type Ctx = {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<Ctx>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const value = useMemo(
    () => ({
      token,
      user,
      login: (t: string, u: User) => {
        setToken(t);
        setUser(u);
      },
      logout: () => {
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
