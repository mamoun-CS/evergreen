'use client';
import { createContext, useContext } from 'react';

const AuthContext = createContext<boolean>(false);

export function AuthProvider({ isAuthenticated, children }: { isAuthenticated: boolean, children: React.ReactNode }) {
  return <AuthContext.Provider value={isAuthenticated}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
