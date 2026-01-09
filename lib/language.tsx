// lib/language.tsx
// Language context for managing English/Tamil language preference

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, TranslationKey, translations } from './translations';

const LANGUAGE_STORAGE_KEY = 'yss_pondy_language';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved language preference on mount
    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
                if (savedLang === 'en' || savedLang === 'ta') {
                    setLanguageState(savedLang);
                }
            } catch (error) {
                console.error('Error loading language preference:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadLanguage();
    }, []);

    // Save language preference when changed
    const setLanguage = async (lang: Language) => {
        setLanguageState(lang);
        try {
            await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        } catch (error) {
            console.error('Error saving language preference:', error);
        }
    };

    // Translation function
    const t = (key: TranslationKey): string => {
        return translations[language][key] || translations.en[key] || key;
    };

    // Don't render until language is loaded to prevent flash
    if (!isLoaded) {
        return null;
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
