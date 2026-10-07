import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { login as loginRequest } from '../services/authService';

const AuthContext = createContext(null);
const IDLE = 3 * 60 * 1000;

export function AuthProvider({
    children
}) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('barlounge_user') || 'null');
        } catch {
            return null;
        }
    });
    const timer = useRef(null);
    const last = useRef(0);
    const logout = () => {
        localStorage.removeItem('barlounge_token');
        localStorage.removeItem('barlounge_user');
        setUser(null);
    };
    const login = async (code, password) => {
        const r = await loginRequest(code, password);
        localStorage.setItem('barlounge_token', r.token);
        localStorage.setItem('barlounge_user', JSON.stringify(r.user));
        setUser(r.user);
        return r;
    };
    useEffect(() => {
        if (!user) return undefined;
        const reset = () => {
            const now = Date.now();
            if (now - last.current < 1000) return;
            last.current = now;
            clearTimeout(timer.current);
            timer.current = setTimeout(logout, IDLE);
        };
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, reset));
        reset();
        return () => {
            events.forEach(e => window.removeEventListener(e, reset));
            clearTimeout(timer.current);
        };
    }, [user]);
    const value = useMemo(() => ({
        user,
        login,
        logout
    }), [user]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);