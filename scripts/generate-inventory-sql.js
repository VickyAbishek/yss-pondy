// Script to convert Excel to SQL INSERT statements
// Run with: node scripts/generate-inventory-sql.js

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, '../assets/images/ycode_dd_mm_yy_14-07-2025.xls'));
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON, skip header row
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Skip first 2 rows (title row and header row)
const headers = data[1]; // Header row
const rows = data.slice(2); // Data rows

console.log(`Found ${rows.length} rows`);
console.log('Headers:', headers);

// Generate SQL
let sql = `-- Auto-generated from Excel file
-- ${new Date().toISOString()}
-- ${rows.length} products

`;

let validCount = 0;

rows.forEach((row, index) => {
    const slNo = row[0];
    const serial = row[1];
    const productId = row[2];
    const isbn = row[3];
    const productName = row[4];
    const language = row[5] || '';
    const priceStr = row[6] || 'Rs.0';
    const quantity = row[7] || 0;
    const weight = row[8] || null;
    const category = row[9] || '';

    // Skip empty rows
    if (!productName || !serial) {
        return;
    }

    // Parse price: "Rs.1,200.00 " -> 1200.00
    let price = 0;
    if (priceStr) {
        const cleanPrice = String(priceStr).replace(/Rs\./g, '').replace(/,/g, '').replace(/\s/g, '').trim();
        price = parseFloat(cleanPrice) || 0;
    }

    // Escape single quotes in strings
    const escapedName = String(productName).replace(/'/g, "''");
    const escapedIsbn = String(isbn).replace(/'/g, "''");
    const escapedSerial = String(serial).replace(/'/g, "''");
    const escapedProductId = String(productId).replace(/'/g, "''");
    const escapedLang = String(language).replace(/'/g, "''");
    const escapedCategory = String(category).replace(/'/g, "''");

    const weightValue = weight ? weight : 'NULL';
    const quantityValue = parseInt(quantity) || 0;

    sql += `INSERT INTO public.books (serial, product_id, isbn, title, language, price, stock, weight, category) VALUES ('${escapedSerial}', '${escapedProductId}', '${escapedIsbn}', '${escapedName}', '${escapedLang}', ${price}, ${quantityValue}, ${weightValue}, '${escapedCategory}');\n`;
    validCount++;
});

sql += `\n-- Total: ${validCount} products inserted\n`;

// Write to file
const outputPath = path.join(__dirname, '../supabase_inventory_import.sql');
fs.writeFileSync(outputPath, sql);

console.log(`\nGenerated ${validCount} INSERT statements`);
console.log(`Output: ${outputPath}`);
