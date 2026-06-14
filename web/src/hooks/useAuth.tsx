import { api } from "@/lib/api";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

interface User {
	id: string;
	email: string;
}

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	refetch: () => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchMe = useCallback(async () => {
		try {
			const { user } = await api.auth.me();
			setUser(user);
		} catch {
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchMe();
	}, [fetchMe]);

	const logout = useCallback(async () => {
		await api.auth.logout();
		setUser(null);
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, refetch: fetchMe, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
