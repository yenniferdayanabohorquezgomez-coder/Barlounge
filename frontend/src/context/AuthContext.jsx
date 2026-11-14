import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import {
    login as loginRequest,
    logout as logoutRequest
} from '../services/authService';

const AuthContext = createContext(null);

const IDLE_TIME = 3 * 60 * 1000;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem('barlounge_user') || 'null'
            );
        } catch {
            return null;
        }
    });

    const timer = useRef(null);
    const lastActivity = useRef(Date.now());
    const loggingOut = useRef(false);

    // ========================================================
    // LOGOUT
    // ========================================================

    const logout = useCallback(async () => {
        if (loggingOut.current) return;

        loggingOut.current = true;

        const token = localStorage.getItem('barlounge_token');

        clearTimeout(timer.current);

        // Revocar primero la sesión en el backend.
        if (token) {
            try {
                await logoutRequest();
            } catch (error) {
                console.warn(
                    'The server session may already be expired.',
                    error
                );
            }
        }

        localStorage.removeItem('barlounge_token');
        localStorage.removeItem('barlounge_user');

        setUser(null);

        loggingOut.current = false;
    }, []);

    // ========================================================
    // LOGIN
    // ========================================================

    const login = useCallback(async (code, password) => {
        const response = await loginRequest(
            code,
            password
        );

        localStorage.setItem(
            'barlounge_token',
            response.token
        );

        localStorage.setItem(
            'barlounge_user',
            JSON.stringify(response.user)
        );

        lastActivity.current = Date.now();

        setUser(response.user);

        return response;
    }, []);

    // ========================================================
    // INACTIVITY CONTROL
    // ========================================================

    useEffect(() => {
        if (!user) {
            clearTimeout(timer.current);
            return undefined;
        }

        const resetTimer = () => {
            if (loggingOut.current) return;

            lastActivity.current = Date.now();

            clearTimeout(timer.current);

            timer.current = setTimeout(() => {
                logout();
            }, IDLE_TIME);
        };

        const events = [
            'mousemove',
            'mousedown',
            'keydown',
            'scroll',
            'touchstart',
            'click'
        ];

        events.forEach(event => {
            window.addEventListener(
                event,
                resetTimer,
                { passive: true }
            );
        });

        // Iniciar el temporizador.
        resetTimer();

        return () => {
            events.forEach(event => {
                window.removeEventListener(
                    event,
                    resetTimer
                );
            });

            clearTimeout(timer.current);
        };
    }, [user, logout]);

    // ========================================================
    // SYNCHRONIZE LOGOUT BETWEEN TABS
    // ========================================================

    useEffect(() => {
        const handleStorage = event => {
            if (
                event.key === 'barlounge_token' &&
                event.newValue === null
            ) {
                clearTimeout(timer.current);
                setUser(null);
            }
        };

        window.addEventListener(
            'storage',
            handleStorage
        );

        return () => {
            window.removeEventListener(
                'storage',
                handleStorage
            );
        };
    }, []);

    // ========================================================
    // CONTEXT
    // ========================================================

    const value = useMemo(() => ({
        user,
        login,
        logout
    }), [
        user,
        login,
        logout
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);