import { Redirect, Stack, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { BottomNavigation } from '../../components/ui/BottomNavigation';
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

    // Pending users typically shouldn't see the nav bar, but for now we'll allow it or hide if needed.
    // If pending, just return the stack as is (or handle specifically). 
    // Assuming pending users stay on /pending, we can conditionally render the nav bar.
    if (isPending) {
        return (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.yss.cream } }}>
                <Stack.Screen name="pending" />
                {/* Other screens might be accessible if typed in URL, but auth guard usually prevents data access */}
            </Stack>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: Colors.yss.cream }}>
            <View style={{ flex: 1 }}>
                <Stack screenOptions={{
                    headerShown: false,
                    contentStyle: {
                        backgroundColor: Colors.yss.cream,
                        paddingBottom: 80 // Add padding for bottom bar
                    }
                }}>
                    <Stack.Screen name="dashboard" />
                    <Stack.Screen name="inventory/index" />
                    <Stack.Screen name="inventory/add" />
                    <Stack.Screen name="sales" />
                    <Stack.Screen name="reports" />
                    <Stack.Screen name="admin/users" />
                </Stack>
            </View>
            <BottomNavigation />
        </View>
    );
}
