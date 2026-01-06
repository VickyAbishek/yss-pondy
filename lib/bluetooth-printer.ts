/**
 * Web Bluetooth API handler for thermal receipt printers
 * Supports common BLE thermal printer service UUIDs
 */

// Common thermal printer BLE service UUIDs
const PRINTER_SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serial port service
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Alternate thermal printer
];

// Common write characteristic UUIDs
const WRITE_CHARACTERISTIC_UUIDS = [
    '00002af1-0000-1000-8000-00805f9b34fb', // Common write characteristic
    '49535343-8841-43f4-a8d4-ecbe34729bb3', // Serial port write
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // Alternate write
];

export interface PrinterDevice {
    id: string;
    name: string;
}

export interface PrinterConnection {
    device: BluetoothDevice;
    server: BluetoothRemoteGATTServer;
    service: BluetoothRemoteGATTService;
    characteristic: BluetoothRemoteGATTCharacteristic;
}

let currentConnection: PrinterConnection | null = null;

/**
 * Check if Web Bluetooth API is available
 */
export function isBluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' &&
        'bluetooth' in navigator &&
        typeof navigator.bluetooth !== 'undefined';
}

/**
 * Scan for available Bluetooth printers
 * @returns Promise<PrinterDevice[]> - List of available printers
 */
export async function scanForPrinters(): Promise<BluetoothDevice> {
    if (!isBluetoothAvailable()) {
        throw new Error('Web Bluetooth is not available. Please use Chrome on Android, Windows, or macOS.');
    }

    try {
        // Request device with printer services or accept all
        const device = await navigator.bluetooth.requestDevice({
            filters: PRINTER_SERVICE_UUIDS.map(uuid => ({ services: [uuid] })),
            optionalServices: PRINTER_SERVICE_UUIDS,
        });

        return device;
    } catch (error: any) {
        // If no devices found with specific services, try with name filter
        if (error.message?.includes('No Services matching')) {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: PRINTER_SERVICE_UUIDS,
            });
            return device;
        }
        throw error;
    }
}

/**
 * Connect to a Bluetooth printer
 * @param device - BluetoothDevice to connect to
 */
export async function connectToPrinter(device: BluetoothDevice): Promise<PrinterConnection> {
    if (!device.gatt) {
        throw new Error('GATT is not available on this device');
    }

    // Connect to GATT server
    const server = await device.gatt.connect();

    // Try to find a compatible service
    let service: BluetoothRemoteGATTService | null = null;
    for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
            service = await server.getPrimaryService(uuid);
            console.log('Found printer service:', uuid);
            break;
        } catch {
            // Try next UUID
        }
    }

    if (!service) {
        // Try to get any available services
        const services = await server.getPrimaryServices();
        if (services.length > 0) {
            service = services[0];
            console.log('Using first available service:', service.uuid);
        } else {
            throw new Error('No compatible printer service found');
        }
    }

    // Try to find a writable characteristic
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    // First, try known characteristics
    for (const uuid of WRITE_CHARACTERISTIC_UUIDS) {
        try {
            characteristic = await service.getCharacteristic(uuid);
            console.log('Found write characteristic:', uuid);
            break;
        } catch {
            // Try next UUID
        }
    }

    // If not found, try to find any writable characteristic
    if (!characteristic) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
                characteristic = char;
                console.log('Using writable characteristic:', char.uuid);
                break;
            }
        }
    }

    if (!characteristic) {
        throw new Error('No writable characteristic found on printer');
    }

    currentConnection = { device, server, service, characteristic };

    // Set up disconnect handler
    device.addEventListener('gattserverdisconnected', () => {
        console.log('Printer disconnected');
        currentConnection = null;
    });

    return currentConnection;
}

/**
 * Disconnect from the current printer
 */
export function disconnectPrinter(): void {
    if (currentConnection?.device.gatt?.connected) {
        currentConnection.device.gatt.disconnect();
    }
    currentConnection = null;
}

/**
 * Check if printer is connected
 */
export function isPrinterConnected(): boolean {
    return currentConnection !== null &&
        currentConnection.device.gatt?.connected === true;
}

/**
 * Get current connection info
 */
export function getCurrentPrinter(): PrinterDevice | null {
    if (!currentConnection) return null;
    return {
        id: currentConnection.device.id,
        name: currentConnection.device.name || 'Unknown Printer',
    };
}

/**
 * Send data to printer
 * @param data - Uint8Array of ESC/POS encoded data
 */
export async function printData(data: Uint8Array): Promise<void> {
    if (!currentConnection) {
        throw new Error('No printer connected');
    }

    if (!currentConnection.device.gatt?.connected) {
        throw new Error('Printer is disconnected');
    }

    // Many BLE printers have a maximum packet size (usually 20 bytes for BLE 4.0)
    // We need to chunk the data
    const CHUNK_SIZE = 20;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);

        // Use writeValueWithoutResponse if available, otherwise use writeValue
        if (currentConnection.characteristic.properties.writeWithoutResponse) {
            await currentConnection.characteristic.writeValueWithoutResponse(chunk);
        } else {
            await currentConnection.characteristic.writeValue(chunk);
        }

        // Small delay between chunks to prevent buffer overflow
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

/**
 * Print raw ESC/POS encoded data
 */
export async function print(encodedData: Uint8Array): Promise<void> {
    await printData(encodedData);
}
