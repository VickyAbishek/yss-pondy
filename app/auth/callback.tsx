import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            // Supabase automatically handles the OAuth callback
            // and sets the session from the URL hash/query params
            // We just need to wait a moment for it to process
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if we have a session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (session) {
                // Successfully authenticated, redirect to dashboard
                router.replace('/(auth)/dashboard');
            } else {
                // No session found, redirect back to login
                setError('Authentication failed. Please try again.');
                setTimeout(() => {
                    router.replace('/');
                }, 2000);
            }
        } catch (err: any) {
            console.error('Auth callback error:', err);
            setError(err.message || 'An error occurred during authentication');
            setTimeout(() => {
                router.replace('/');
            }, 3000);
        }
    };

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>❌ {error}</Text>
                <Text style={styles.subText}>Redirecting to login...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.yss.orange} />
            <Text style={styles.text}>Completing sign in...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.yss.cream,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        marginTop: 20,
        fontSize: 16,
        color: Colors.yss.text,
    },
    errorText: {
        fontSize: 16,
        color: '#d32f2f',
        textAlign: 'center',
        marginBottom: 10,
    },
    subText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});
