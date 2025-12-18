/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [NativeWind](https://www.nativewind.dev/) uses Tailwind CSS.
 */

const tintColorLight = '#BB4F27';
const tintColorDark = '#BB4F27'; // Keeping consistent for now or adapt for dark mode

export const Colors = {
    light: {
        text: '#2C1810', // Deep brown/black for contrast on cream
        background: '#FCF4D2', // Cream
        tint: tintColorLight,
        icon: '#687076',
        tabIconDefault: '#687076',
        tabIconSelected: tintColorLight,
        card: '#FFFFFF',
        primary: '#BB4F27',
    },
    dark: {
        text: '#ECEDEE',
        background: '#151718', // Standard dark or should we map the cream to a dark variant? User asked for specific palette. sticking to standard dark for now, but main UI will force light mode colors if "YSS" style is strict.
        tint: tintColorDark,
        icon: '#9BA1A6',
        tabIconDefault: '#9BA1A6',
        tabIconSelected: tintColorDark,
        card: '#272A2D',
        primary: '#BB4F27',
    },
    // Custom YSS Palette
    yss: {
        orange: '#BB4F27',
        cream: '#FCF4D2',
        white: '#FFFFFF',
        secondaryOrange: '#bb5027',
        text: '#2C1810',
        icon: '#687076',
    }
};
