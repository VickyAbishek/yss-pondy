import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
    const router = useRouter();
    const { session, loading, debugSignIn } = useAuth();
    const [authLoading, setAuthLoading] = useState(false);

    React.useEffect(() => {
        if (session) {
            router.replace('/(auth)/dashboard');
        }
    }, [session]);

    const handleGoogleLogin = async () => {
        setAuthLoading(true);
        try {
            if (debugSignIn) {
                await debugSignIn();
                return;
            }

            // Logic for Google Login
            // For Web: supabase.auth.signInWithOAuth({ provider: 'google' })
            // For Native: Needs deep linking setup (scheme)
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (error: any) {
            alert('Error logging in: ' + (error?.message || 'Unknown error'));
        } finally {
            setAuthLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.yss.orange} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/images/py.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>YSS Books Inventory</Text>
                    <Text style={styles.subtitle}>Welcome Back.</Text>
                </View>

                <View style={styles.form}>
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                        disabled={authLoading}
                    >
                        <Text style={styles.googleButtonText}>
                            {authLoading ? 'Connecting...' : 'Login with Google'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton}>
                        <Text style={styles.linkText}>Create an Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.yss.cream,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 400,
        padding: 20,
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    logoImage: {
        width: 200,
        height: 200,
        marginBottom: 20,
        borderRadius: 75,
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    title: {
        fontSize: 24,
        color: Colors.yss.orange,
        fontFamily: 'serif',
        marginBottom: 10,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 28,
        color: Colors.yss.text,
        fontFamily: 'serif',
        fontWeight: 'bold',
    },
    form: {
        width: '100%',
        gap: 15,
    },
    googleButton: {
        backgroundColor: Colors.yss.orange,
        paddingVertical: 16,
        borderRadius: 30, // Pill shape
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    googleButtonText: {
        color: Colors.yss.white,
        fontSize: 18,
        fontWeight: '600',
    },
    linkButton: {
        alignItems: 'center',
        marginTop: 10,
    },
    linkText: {
        color: Colors.yss.text,
        fontSize: 14,
        opacity: 0.6,
    }
});
