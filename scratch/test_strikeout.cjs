const XLSX = require('xlsx');

// Create a workbook with sample data
const wb = XLSX.utils.book_new();
const wsData = [
    ["S. No.", "Name of Member", "Date", "Share Certificate Number", "Number of Shares", "Consideration (USD)", "CURRENCY", "INDIVIDUAL/CORPORATE"],
    [1, "Maran", "12 Sept 2011", 1, 1, 1, "USD", "INDIVIDUAL"],
    [2, "PUSHPA BINDAL", "20 Dec 2012", 2, 199975, 199975, "USD", "INDIVIDUAL"],
    [3, "PRERNA SINGH", "20 Dec 2012", 3, 200000, 200000, "USD", "INDIVIDUAL"],
    [4, "PUSHPA BINDAL", "2 Jan 2013", 4, 199975, 199975, "USD", "INDIVIDUAL"],
    [5, "PRERNA SINGH", "2 Jan 2013", 5, 200000, 200000, "USD", "INDIVIDUAL"],
    [6, "Maran", "21 Jun 2021", 1, -1, -1, "USD", "INDIVIDUAL"],
    [7, "ORUGANTI VIJAYALAKSHMI", "21 Jun 2021", 6, 1, 1, "USD", "INDIVIDUAL"]
];

const ws = XLSX.utils.aoa_to_sheet(wsData);

// Add font strike style to row 1 (cell B2, E2, F2) and row 6 (cell B7, E7, F7)
ws['B2'].s = { font: { strike: true } };
ws['E2'].s = { font: { strike: true } };
ws['F2'].s = { font: { strike: true } };

ws['B7'].s = { font: { strike: true } };
ws['E7'].s = { font: { strike: true } };
ws['F7'].s = { font: { strike: true } };

wb.SheetNames.push("Members");
wb.Sheets["Members"] = ws;

// Write workbook to buffer
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });

// Now read workbook back
const readWb = XLSX.read(buf, { type: 'buffer', cellStyles: true, cellHTML: true });
const readWs = readWb.Sheets["Members"];

console.log("B2 Cell:", readWs['B2']);
console.log("B3 Cell:", readWs['B3']);

function isCellStruckOut(cellObj) {
    if (!cellObj) return false;
    if (cellObj.s && cellObj.s.font) {
        if (cellObj.s.font.strike || cellObj.s.font.strikethrough) return true;
    }
    if (Array.isArray(cellObj.r)) {
        for (let i = 0; i < cellObj.r.length; i++) {
            const run = cellObj.r[i];
            if (run && run.font && (run.font.strike || run.font.strikethrough)) return true;
        }
    }
    if (cellObj.h) {
        const hStr = String(cellObj.h);
        if (/<(s|strike|del)\b/i.test(hStr) || /style="[^"]*text-decoration\s*:\s*line-through/i.test(hStr)) {
            return true;
        }
    }
    const valStr = String(cellObj.w || cellObj.v || '');
    if (/<(s|strike|del)\b/i.test(valStr) || /~~.+~~/.test(valStr) || /\u0336/.test(valStr)) {
        return true;
    }
    return false;
}

console.log("is B2 Struck Out?", isCellStruckOut(readWs['B2']));
console.log("is B3 Struck Out?", isCellStruckOut(readWs['B3']));
