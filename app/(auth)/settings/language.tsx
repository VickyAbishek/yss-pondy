import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { useLanguage } from '../../../lib/language';

export default function LanguageSettingsScreen() {
    const router = useRouter();
    const { language, setLanguage, t } = useLanguage();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('languageSettings')}</Text>
                <View style={styles.backButton} />
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>{t('selectLanguage')}</Text>

                <View style={styles.languageOptions}>
                    {/* English Option */}
                    <TouchableOpacity
                        style={[styles.languageCard, language === 'en' && styles.languageCardActive]}
                        onPress={() => setLanguage('en')}
                    >
                        <View style={styles.languageInfo}>
                            <Text style={styles.languageFlag}>🇬🇧</Text>
                            <View>
                                <Text style={[styles.languageName, language === 'en' && styles.languageNameActive]}>
                                    English
                                </Text>
                                <Text style={styles.languageNative}>English</Text>
                            </View>
                        </View>
                        {language === 'en' && (
                            <Ionicons name="checkmark-circle" size={28} color={Colors.yss.orange} />
                        )}
                    </TouchableOpacity>

                    {/* Tamil Option */}
                    <TouchableOpacity
                        style={[styles.languageCard, language === 'ta' && styles.languageCardActive]}
                        onPress={() => setLanguage('ta')}
                    >
                        <View style={styles.languageInfo}>
                            <Text style={styles.languageFlag}>🇮🇳</Text>
                            <View>
                                <Text style={[styles.languageName, language === 'ta' && styles.languageNameActive]}>
                                    Tamil
                                </Text>
                                <Text style={styles.languageNative}>தமிழ்</Text>
                            </View>
                        </View>
                        {language === 'ta' && (
                            <Ionicons name="checkmark-circle" size={28} color={Colors.yss.orange} />
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.note}>
                    {language === 'en'
                        ? 'Language will change immediately across all screens.'
                        : 'மொழி அனைத்து திரைகளிலும் உடனடியாக மாறும்.'
                    }
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.yss.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    backButton: {
        width: 40,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
    },
    languageOptions: {
        gap: 15,
    },
    languageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    languageCardActive: {
        borderColor: Colors.yss.orange,
        backgroundColor: '#fff8f0',
    },
    languageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    languageFlag: {
        fontSize: 36,
    },
    languageName: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    languageNameActive: {
        color: Colors.yss.orange,
    },
    languageNative: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    note: {
        marginTop: 30,
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
