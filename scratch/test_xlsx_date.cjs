const XLSX = require('xlsx');

// In Excel, 46197 is 2026-06-30 (or let's check exact serial for 2026-06-30)
// 1900-01-01 is serial 1.
// 2026-06-30 is serial 46197 (or around 46197)
// Let's test with XLSX format_cell or XLSX sheet_to_json with cellDates: true vs raw: false

const wb = XLSX.utils.book_new();
const wsData = [
    ["Last AGM Date"],
    ["30 Jun 2026"],
    ["30/06/2026"],
    ["2026-06-30"]
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, "Home");
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const parsedWb = XLSX.read(buf, { type: 'buffer', cellDates: true });
const parsedWs = parsedWb.Sheets["Home"];

console.log("Sheet cells:");
console.log("A2:", parsedWs["A2"]);
console.log("A3:", parsedWs["A3"]);
console.log("A4:", parsedWs["A4"]);

const formatDate = (val) => {
    if (!val || val === '—' || val === 'NA' || val === 'N/A' || val === 'null' || val === 'undefined') return '';
    if (val instanceof Date) {
        // Add 12 hours to handle SheetJS date timezone shift near midnight (e.g. 23:59:43 or 18:30:00 of prev day)
        const adjusted = new Date(val.getTime() + 12 * 3600 * 1000);
        const year = adjusted.getUTCFullYear();
        const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
        const day = String(adjusted.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    const str = String(val).trim();
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
    }
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
        return `${dmyMatch[3]}-${String(dmyMatch[2]).padStart(2, '0')}-${String(dmyMatch[1]).padStart(2, '0')}`;
    }
    const monthMap = {
        jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
        jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
        january:'01', february:'02', march:'03', april:'04', june:'06',
        july:'07', august:'08', september:'09', october:'10', november:'11', december:'12'
    };
    const textMatch = str.match(/^(\d{1,2})[\s\-\/]+([a-zA-Z]+)[\s\-\/,\.]+(\d{4})/);
    if (textMatch) {
        const d = String(textMatch[1]).padStart(2, '0');
        const m = monthMap[textMatch[2].toLowerCase()] || '01';
        const y = textMatch[3];
        return `${y}-${m}-${d}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const adjusted = new Date(d.getTime() + 12 * 3600 * 1000);
        const year = adjusted.getUTCFullYear();
        const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
        const day = String(adjusted.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return str;
};

console.log("formatDate(A2.v):", formatDate(parsedWs["A2"].v));
console.log("formatDate(A3.v):", formatDate(parsedWs["A3"].v));
console.log("formatDate(A4.v):", formatDate(parsedWs["A4"].v));
