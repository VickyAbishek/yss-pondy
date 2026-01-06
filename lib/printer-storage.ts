/**
 * AsyncStorage wrapper for printer configuration
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRINTER_STORAGE_KEY = '@yss_pondy_printer';

export interface SavedPrinter {
    id: string;
    name: string;
    savedAt: string;
}

/**
 * Save printer configuration to storage
 */
export async function savePrinter(printer: { id: string; name: string }): Promise<void> {
    const saved: SavedPrinter = {
        id: printer.id,
        name: printer.name,
        savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(saved));
}

/**
 * Get saved printer from storage
 */
export async function getSavedPrinter(): Promise<SavedPrinter | null> {
    try {
        const data = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
        if (data) {
            return JSON.parse(data) as SavedPrinter;
        }
    } catch (error) {
        console.error('Error loading saved printer:', error);
    }
    return null;
}

/**
 * Remove saved printer from storage
 */
export async function removeSavedPrinter(): Promise<void> {
    await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
}
