const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function inspectExcel() {
    const filePath = path.join(__dirname, '..', '3B_Trading_Consulting_Document_Category_Analysis.xlsx');
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer', cellStyles: true, cellHTML: true, cellNF: true, cellDates: true });

    for (const name of wb.SheetNames) {
        const sheet = wb.Sheets[name];
        console.log(`\n--- Sheet: ${name} ---`);
        for (const cellRef in sheet) {
            if (cellRef.startsWith('!')) continue;
            const cellObj = sheet[cellRef];
            console.log(`Cell ${cellRef}:`, JSON.stringify(cellObj));
        }
    }
}

inspectExcel();
