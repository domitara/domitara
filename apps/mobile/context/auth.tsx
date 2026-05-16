import { createContext, useContext, useState, type ReactNode } from 'react';

type AuthContextType = {
  serverUrl: string;
  token: string | null;
  login: (serverUrl: string, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState<string | null>(null);

  return (
    <AuthContext.Provider
      value={{
        serverUrl,
        token,
        login: (url, tok) => {
          setServerUrl(url);
          setToken(tok);
        },
        logout: () => {
          setServerUrl('');
          setToken(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
