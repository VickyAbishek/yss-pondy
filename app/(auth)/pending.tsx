import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function PendingScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Ionicons name="time-outline" size={80} color={Colors.yss.orange} />
            <Text style={styles.title}>Approval Pending</Text>
            <Text style={styles.message}>
                Namaste! Your account is currently waiting for admin approval. Please check back later.
            </Text>

            {/* Dev only: Back to home to test logout if we implemented it */}
            {/* <Link href="/" style={{marginTop: 50}}>Back</Link> */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.yss.cream,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    title: {
        fontSize: 28,
        fontFamily: 'serif',
        color: Colors.yss.text,
        marginVertical: 20,
        fontWeight: 'bold',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        color: Colors.yss.text,
        opacity: 0.8,
        lineHeight: 24,
    }
});
