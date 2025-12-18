import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../lib/auth';

export default function AppLayout() {
    const { session, loading, isPending } = useAuth();
    const segments = useSegments();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.yss.cream }}>
                <ActivityIndicator size="large" color={Colors.yss.orange} />
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/" />;
    }

    // Check if we are already on the pending screen to avoid loop
    const isPendingScreen = segments.find(s => s === 'pending');
    if (isPending && !isPendingScreen) {
        return <Redirect href="/(auth)/pending" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.yss.cream } }}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="pending" />
            <Stack.Screen name="inventory/index" />
            <Stack.Screen name="inventory/add" />
            <Stack.Screen name="sales" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="admin/users" />
        </Stack>
    );
}
