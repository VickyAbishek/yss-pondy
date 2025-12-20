import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../lib/supabase';

export default function ReportsScreen() {
    const router = useRouter();
    const [generating, setGenerating] = useState<string | null>(null);

    const formatDate = (date: Date) => {
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const generatePDFHeader = (title: string) => {
        const now = new Date();
        return `
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #E85D04; padding-bottom: 20px;">
                <h1 style="color: #E85D04; margin: 0; font-size: 28px;">YSS Pondy</h1>
                <h2 style="color: #333; margin: 10px 0; font-size: 20px;">${title}</h2>
                <p style="color: #666; margin: 0; font-size: 12px;">Generated on: ${formatDate(now)}</p>
            </div>
        `;
    };

    const generateTodaySalesReport = async () => {
        setGenerating('sales');
        try {
            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Fetch today's sales with items
            const { data: sales, error } = await supabase
                .from('sales')
                .select(`
                    id,
                    total_amount,
                    discount_applied,
                    created_at,
                    sale_items (
                        quantity,
                        price_at_sale,
                        books (title, isbn)
                    )
                `)
                .gte('created_at', today.toISOString())
                .lt('created_at', tomorrow.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Calculate totals
            const totalSales = sales?.length || 0;
            const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
            const totalDiscount = sales?.reduce((sum, sale) => sum + (sale.discount_applied || 0), 0) || 0;

            // Generate HTML table
            let salesRows = '';
            sales?.forEach((sale, index) => {
                const items = sale.sale_items?.map((item: any) =>
                    `${item.books?.title || 'Unknown'} x${item.quantity}`
                ).join(', ') || 'No items';

                salesRows += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${new Date(sale.created_at).toLocaleTimeString('en-IN')}</td>
                        <td style="max-width: 200px;">${items}</td>
                        <td>₹${(sale.discount_applied || 0).toFixed(2)}</td>
                        <td><strong>₹${(sale.total_amount || 0).toFixed(2)}</strong></td>
                    </tr>
                `;
            });

            if (!salesRows) {
                salesRows = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No sales recorded today</td></tr>`;
            }

            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
                        th { background-color: #E85D04; color: white; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    </style>
                </head>
                <body>
                    ${generatePDFHeader("Today's Sales Report")}
                    
                    <div class="summary">
                        <div class="summary-row"><span>Total Transactions:</span><strong>${totalSales}</strong></div>
                        <div class="summary-row"><span>Total Discounts:</span><strong>₹${totalDiscount.toFixed(2)}</strong></div>
                        <div class="summary-row"><span>Total Revenue:</span><strong style="color: #E85D04;">₹${totalRevenue.toFixed(2)}</strong></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Time</th>
                                <th>Items</th>
                                <th>Discount</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${salesRows}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            await printOrSharePDF(html, 'Sales_Report');
        } catch (error: any) {
            console.error('Error generating sales report:', error);
            window.alert('Failed to generate report: ' + (error.message || 'Unknown error'));
        } finally {
            setGenerating(null);
        }
    };

    const generateAllSalesReport = async () => {
        setGenerating('allsales');
        try {
            // Fetch ALL sales with items (no date filter)
            const { data: sales, error } = await supabase
                .from('sales')
                .select(`
                    id,
                    total_amount,
                    discount_applied,
                    created_at,
                    sale_items (
                        quantity,
                        price_at_sale,
                        books (title, isbn)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Calculate totals
            const totalSales = sales?.length || 0;
            const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
            const totalDiscount = sales?.reduce((sum, sale) => sum + (sale.discount_applied || 0), 0) || 0;

            // Generate HTML table
            let salesRows = '';
            sales?.forEach((sale, index) => {
                const items = sale.sale_items?.map((item: any) =>
                    `${item.books?.title || 'Unknown'} x${item.quantity}`
                ).join(', ') || 'No items';

                const saleDate = new Date(sale.created_at);
                const dateStr = saleDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                salesRows += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${dateStr}<br/><small style="color:#666;">${timeStr}</small></td>
                        <td style="max-width: 200px;">${items}</td>
                        <td>₹${(sale.discount_applied || 0).toFixed(2)}</td>
                        <td><strong>₹${(sale.total_amount || 0).toFixed(2)}</strong></td>
                    </tr>
                `;
            });

            if (!salesRows) {
                salesRows = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No sales recorded</td></tr>`;
            }

            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
                        th { background-color: #9C27B0; color: white; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    </style>
                </head>
                <body>
                    ${generatePDFHeader("All Sales Report")}
                    
                    <div class="summary">
                        <div class="summary-row"><span>Total Transactions:</span><strong>${totalSales}</strong></div>
                        <div class="summary-row"><span>Total Discounts:</span><strong>₹${totalDiscount.toFixed(2)}</strong></div>
                        <div class="summary-row"><span>Total Revenue:</span><strong style="color: #9C27B0;">₹${totalRevenue.toFixed(2)}</strong></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date & Time</th>
                                <th>Items</th>
                                <th>Discount</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${salesRows}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            await printOrSharePDF(html, 'All_Sales_Report');
        } catch (error: any) {
            console.error('Error generating all sales report:', error);
            window.alert('Failed to generate report: ' + (error.message || 'Unknown error'));
        } finally {
            setGenerating(null);
        }
    };

    const generateItemSalesReport = async () => {
        setGenerating('itemsales');
        try {
            // Fetch all sale items grouped by book with total quantities
            const { data: saleItems, error } = await supabase
                .from('sale_items')
                .select(`
                    quantity,
                    price_at_sale,
                    books (id, title, author, isbn, price)
                `);

            if (error) throw error;

            // Aggregate quantities per book
            const bookSalesMap = new Map<string, {
                title: string;
                author: string;
                isbn: string;
                currentPrice: number;
                totalQuantity: number;
                totalRevenue: number;
            }>();

            saleItems?.forEach((item: any) => {
                if (!item.books) return;

                const bookId = item.books.id;
                const existing = bookSalesMap.get(bookId);

                if (existing) {
                    existing.totalQuantity += item.quantity;
                    existing.totalRevenue += item.quantity * item.price_at_sale;
                } else {
                    bookSalesMap.set(bookId, {
                        title: item.books.title || 'Unknown',
                        author: item.books.author || '-',
                        isbn: item.books.isbn || '-',
                        currentPrice: item.books.price || 0,
                        totalQuantity: item.quantity,
                        totalRevenue: item.quantity * item.price_at_sale,
                    });
                }
            });

            // Convert to array and sort by quantity sold (descending)
            const bookSales = Array.from(bookSalesMap.values())
                .sort((a, b) => b.totalQuantity - a.totalQuantity);

            // Calculate totals
            const totalItemsSold = bookSales.reduce((sum, book) => sum + book.totalQuantity, 0);
            const totalRevenue = bookSales.reduce((sum, book) => sum + book.totalRevenue, 0);
            const uniqueBooksSold = bookSales.length;

            // Generate HTML table
            let bookRows = '';
            bookSales.forEach((book, index) => {
                bookRows += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${book.isbn}</td>
                        <td>${book.title}</td>
                        <td>${book.author}</td>
                        <td>₹${book.currentPrice.toFixed(2)}</td>
                        <td style="text-align: center;"><strong>${book.totalQuantity}</strong></td>
                        <td>₹${book.totalRevenue.toFixed(2)}</td>
                    </tr>
                `;
            });

            if (!bookRows) {
                bookRows = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No items sold yet</td></tr>`;
            }

            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                        th { background-color: #FF9800; color: white; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    </style>
                </head>
                <body>
                    ${generatePDFHeader("Item Sales Report")}
                    
                    <div class="summary">
                        <div class="summary-row"><span>Unique Books Sold:</span><strong>${uniqueBooksSold}</strong></div>
                        <div class="summary-row"><span>Total Items Sold:</span><strong>${totalItemsSold}</strong></div>
                        <div class="summary-row"><span>Total Revenue:</span><strong style="color: #FF9800;">₹${totalRevenue.toFixed(2)}</strong></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ISBN</th>
                                <th>Title</th>
                                <th>Author</th>
                                <th>Current Price</th>
                                <th>Qty Sold</th>
                                <th>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookRows}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            await printOrSharePDF(html, 'Item_Sales_Report');
        } catch (error: any) {
            console.error('Error generating item sales report:', error);
            window.alert('Failed to generate report: ' + (error.message || 'Unknown error'));
        } finally {
            setGenerating(null);
        }
    };

    const generateInventoryReport = async () => {
        setGenerating('inventory');
        try {
            // Fetch all books
            const { data: books, error } = await supabase
                .from('books')
                .select('*')
                .order('title', { ascending: true });

            if (error) throw error;

            // Calculate totals
            const totalBooks = books?.length || 0;
            const totalStock = books?.reduce((sum, book) => sum + (book.stock || 0), 0) || 0;
            const totalValue = books?.reduce((sum, book) => sum + ((book.price || 0) * (book.stock || 0)), 0) || 0;

            // Generate HTML table
            let bookRows = '';
            books?.forEach((book, index) => {
                const stockValue = (book.price || 0) * (book.stock || 0);
                bookRows += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${book.isbn || '-'}</td>
                        <td>${book.title || 'Untitled'}</td>
                        <td>${book.author || '-'}</td>
                        <td>${book.language || '-'}</td>
                        <td>₹${(book.price || 0).toFixed(2)}</td>
                        <td><strong>${book.stock || 0}</strong></td>
                        <td>₹${stockValue.toFixed(2)}</td>
                    </tr>
                `;
            });

            if (!bookRows) {
                bookRows = `<tr><td colspan="8" style="text-align: center; padding: 20px;">No books in inventory</td></tr>`;
            }

            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                        th { background-color: #E85D04; color: white; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    </style>
                </head>
                <body>
                    ${generatePDFHeader("Inventory Report")}
                    
                    <div class="summary">
                        <div class="summary-row"><span>Total Book Titles:</span><strong>${totalBooks}</strong></div>
                        <div class="summary-row"><span>Total Stock Units:</span><strong>${totalStock}</strong></div>
                        <div class="summary-row"><span>Total Inventory Value:</span><strong style="color: #E85D04;">₹${totalValue.toFixed(2)}</strong></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>ISBN</th>
                                <th>Title</th>
                                <th>Author</th>
                                <th>Lang</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookRows}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            await printOrSharePDF(html, 'Inventory_Report');
        } catch (error: any) {
            console.error('Error generating inventory report:', error);
            window.alert('Failed to generate report: ' + (error.message || 'Unknown error'));
        } finally {
            setGenerating(null);
        }
    };

    const printOrSharePDF = async (html: string, filename: string) => {
        if (Platform.OS === 'web') {
            // For web, open print dialog
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.print();
            }
        } else {
            // For native, generate PDF and share
            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Share ${filename}`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                await Print.printAsync({ uri });
            }
        }
    };

    const reports = [
        {
            id: 'sales',
            title: "Today's Sales Report",
            description: 'All transactions made today with item details and totals',
            icon: 'receipt-outline',
            color: '#4CAF50',
            onPress: generateTodaySalesReport,
        },
        {
            id: 'allsales',
            title: 'All Sales Report',
            description: 'Complete sales history across all dates',
            icon: 'calendar-outline',
            color: '#9C27B0',
            onPress: generateAllSalesReport,
        },
        {
            id: 'itemsales',
            title: 'Item Sales Report',
            description: 'How many times each book was sold (sorted by popularity)',
            icon: 'stats-chart-outline',
            color: '#FF9800',
            onPress: generateItemSalesReport,
        },
        {
            id: 'inventory',
            title: 'Inventory Report',
            description: 'Complete list of all books with stock and pricing',
            icon: 'library-outline',
            color: '#2196F3',
            onPress: generateInventoryReport,
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reports</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Generate Reports</Text>
                <Text style={styles.sectionSubtitle}>
                    Select a report type to generate a PDF document
                </Text>

                {reports.map((report) => (
                    <TouchableOpacity
                        key={report.id}
                        style={styles.reportCard}
                        onPress={report.onPress}
                        disabled={generating !== null}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: report.color }]}>
                            {generating === report.id ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Ionicons name={report.icon as any} size={28} color="white" />
                            )}
                        </View>
                        <View style={styles.reportInfo}>
                            <Text style={styles.reportTitle}>{report.title}</Text>
                            <Text style={styles.reportDescription}>{report.description}</Text>
                        </View>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={Colors.yss.text}
                            style={{ opacity: 0.5 }}
                        />
                    </TouchableOpacity>
                ))}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.yss.orange} />
                    <Text style={styles.infoText}>
                        Reports are generated as PDF documents. On mobile, you can share or save them.
                        On web, the print dialog will open.
                    </Text>
                </View>
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'serif',
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.yss.text,
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 25,
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.yss.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    reportInfo: {
        flex: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.text,
        marginBottom: 4,
    },
    reportDescription: {
        fontSize: 13,
        color: '#666',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(232, 93, 4, 0.1)',
        padding: 15,
        borderRadius: 12,
        marginTop: 20,
        alignItems: 'flex-start',
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.yss.text,
        lineHeight: 18,
    },
});
