import { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

type AuthContextType = {
    session: Session | null;
    user: any | null;
    loading: boolean;
    isAdmin: boolean;
    isPending: boolean;
    debugSignIn?: () => void;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    isAdmin: false,
    isPending: false,
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else setLoading(false);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else {
                setUser(null);
                setLoading(false);
            }
        });
    }, []);

    async function fetchProfile(userId: string) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            if (data) {
                setUser(data);
                setIsAdmin(data.role === 'admin');
                setIsPending(data.role === 'pending');
            } else {
                // Profile doesn't exist yet (handled in login or trigger)
            }
        } finally {
            setLoading(false);
        }
    }

    async function debugSignIn() {
        // Mock session
        const mockSession: any = {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: {
                id: 'mock-user-vicky',
                email: 'vicky@example.com',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
            },
        };

        // Mock profile
        const mockUser = {
            id: 'mock-user-vicky',
            email: 'vicky@example.com',
            role: 'admin', // Auto-admin for dev
        };

        setSession(mockSession);
        setUser(mockUser);
        setIsAdmin(true);
        setIsPending(false);
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, isAdmin, isPending, debugSignIn }}>
            {children}
        </AuthContext.Provider>
    );
}
