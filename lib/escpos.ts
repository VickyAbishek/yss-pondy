/**
 * ESC/POS Command Encoder for 58mm Thermal Receipt Printers
 * Paper width: 58mm = ~32 characters per line (monospace)
 */

// ESC/POS Commands
export const ESC = 0x1B;
export const GS = 0x1D;
export const LF = 0x0A;

// Text alignment
export const ALIGN_LEFT = 0x00;
export const ALIGN_CENTER = 0x01;
export const ALIGN_RIGHT = 0x02;

// Characters per line for 58mm paper
export const CHARS_PER_LINE = 32;

/**
 * ESC/POS Command Builder for thermal receipt printers
 */
export class EscPosEncoder {
    private buffer: number[] = [];

    /**
     * Initialize the printer
     */
    init(): this {
        // ESC @ - Initialize printer
        this.buffer.push(ESC, 0x40);
        return this;
    }

    /**
     * Set text alignment
     * @param align - ALIGN_LEFT, ALIGN_CENTER, or ALIGN_RIGHT
     */
    align(align: number): this {
        // ESC a n - Select justification
        this.buffer.push(ESC, 0x61, align);
        return this;
    }

    /**
     * Set bold mode
     * @param bold - true to enable, false to disable
     */
    bold(bold: boolean): this {
        // ESC E n - Turn emphasized mode on/off
        this.buffer.push(ESC, 0x45, bold ? 0x01 : 0x00);
        return this;
    }

    /**
     * Set double-height text
     * @param enabled - true to enable, false to disable
     */
    doubleHeight(enabled: boolean): this {
        // GS ! n - Select character size
        // n = 0x00 normal, 0x10 double width, 0x01 double height, 0x11 both
        this.buffer.push(GS, 0x21, enabled ? 0x01 : 0x00);
        return this;
    }

    /**
     * Set double-width text
     * @param enabled - true to enable, false to disable
     */
    doubleWidth(enabled: boolean): this {
        this.buffer.push(GS, 0x21, enabled ? 0x10 : 0x00);
        return this;
    }

    /**
     * Print text and append newline
     * @param text - Text to print
     */
    line(text: string): this {
        this.text(text);
        this.newline();
        return this;
    }

    /**
     * Print text without newline
     * @param text - Text to print
     */
    text(text: string): this {
        // Convert string to bytes (using ASCII/Latin-1)
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            // Replace non-ASCII with question mark for thermal printers
            this.buffer.push(code <= 255 ? code : 0x3F);
        }
        return this;
    }

    /**
     * Add a newline (line feed)
     */
    newline(): this {
        this.buffer.push(LF);
        return this;
    }

    /**
     * Feed specified number of lines
     * @param lines - Number of lines to feed
     */
    feed(lines: number = 1): this {
        for (let i = 0; i < lines; i++) {
            this.buffer.push(LF);
        }
        return this;
    }

    /**
     * Print a horizontal line separator
     * @param char - Character to use for the line (default: '-')
     */
    separator(char: string = '-'): this {
        this.line(char.repeat(CHARS_PER_LINE));
        return this;
    }

    /**
     * Print a left-right aligned row (e.g., "Item      $10.00")
     * @param left - Left-aligned text
     * @param right - Right-aligned text
     */
    leftRight(left: string, right: string): this {
        const spacing = CHARS_PER_LINE - left.length - right.length;
        if (spacing < 1) {
            // If too long, truncate left side
            const maxLeft = CHARS_PER_LINE - right.length - 1;
            this.line(left.substring(0, maxLeft) + ' ' + right);
        } else {
            this.line(left + ' '.repeat(spacing) + right);
        }
        return this;
    }

    /**
     * Print centered text
     * @param text - Text to center
     */
    centered(text: string): this {
        this.align(ALIGN_CENTER);
        this.line(text);
        this.align(ALIGN_LEFT);
        return this;
    }

    /**
     * Cut paper (full cut)
     */
    cut(): this {
        // GS V m - Select cut mode and cut paper
        // m = 0x00 full cut, 0x01 partial cut
        this.feed(3); // Feed some paper before cutting
        this.buffer.push(GS, 0x56, 0x00);
        return this;
    }

    /**
     * Partial cut (leaves a small piece attached)
     */
    partialCut(): this {
        this.feed(3);
        this.buffer.push(GS, 0x56, 0x01);
        return this;
    }

    /**
     * Reset all formatting to defaults
     */
    reset(): this {
        this.bold(false);
        this.doubleHeight(false);
        this.align(ALIGN_LEFT);
        return this;
    }

    /**
     * Get the encoded data as Uint8Array for printing
     */
    encode(): Uint8Array {
        return new Uint8Array(this.buffer);
    }

    /**
     * Clear the buffer
     */
    clear(): this {
        this.buffer = [];
        return this;
    }
}

/**
 * Format currency for receipt display
 * @param amount - Amount in rupees
 */
export function formatCurrency(amount: number): string {
    return `Rs.${amount.toFixed(2)}`;
}

/**
 * Truncate text to fit within character limit
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 2) + '..';
}
