const XLSX = require('xlsx');

// 46197 is serial for 2026-06-30 in Excel
// Let's create a workbook in memory with date 2026-06-30
const wb = XLSX.utils.book_new();
const wsData = [
    ["Last AGM Date"],
    [new Date(2026, 5, 30)] // 30 Jun 2026
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, "Home");
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const parsedWb = XLSX.read(buf, { type: 'buffer', cellDates: true });
const parsedWs = parsedWb.Sheets["Home"];
const parsedData = XLSX.utils.sheet_to_json(parsedWs, { header: 1 });

console.log("Raw cell v:", parsedWs["A2"] ? parsedWs["A2"].v : null);
console.log("Raw cell w:", parsedWs["A2"] ? parsedWs["A2"].w : null);
console.log("Parsed row 1 cell 0:", parsedData[1][0]);
if (parsedData[1][0] instanceof Date) {
    const d = parsedData[1][0];
    console.log("ISO String:", d.toISOString());
    console.log("getDate():", d.getDate(), "getUTCDate():", d.getUTCDate());
    console.log("getFullYear():", d.getFullYear(), "getUTCFullYear():", d.getUTCFullYear());
}
