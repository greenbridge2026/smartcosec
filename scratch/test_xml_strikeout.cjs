const fs = require('fs');
const JSZip = require('jszip');

async function testXlsxStrikeout(buffer) {
    const zip = await JSZip.loadAsync(buffer);

    // 1. Parse xl/styles.xml to find font IDs and cellXf IDs that have strikethrough (<strike/>)
    const stylesXmlText = await zip.file('xl/styles.xml')?.async('text');
    const strikeFontIds = new Set();
    const strikeStyleIds = new Set();

    if (stylesXmlText) {
        // Find font indices with <strike
        // We match each <font>...</font>
        const fontMatches = stylesXmlText.match(/<font[\s\S]*?<\/font>/gi) || [];
        fontMatches.forEach((fontXml, fontIdx) => {
            if (/<strike\b/i.test(fontXml)) {
                strikeFontIds.add(fontIdx);
            }
        });

        // Find cellXf indices (style IDs) that use a strike fontId
        // Match <cellXfs> ... </cellXfs>
        const cellXfsMatch = stylesXmlText.match(/<cellXfs[\s\S]*?<\/cellXfs>/i);
        if (cellXfsMatch) {
            const xfMatches = cellXfsMatch[0].match(/<xf[\s\S]*?(\/>|<\/xf>)/gi) || [];
            xfMatches.forEach((xfXml, styleIdx) => {
                const fontIdMatch = xfXml.match(/fontId="(\d+)"/i);
                if (fontIdMatch) {
                    const fontId = parseInt(fontIdMatch[1], 10);
                    if (strikeFontIds.has(fontId)) {
                        strikeStyleIds.add(styleIdx);
                    }
                }
            });
        }
    }

    // 2. Parse xl/sharedStrings.xml to find string indices with inline rich text <strike/>
    const sharedStringsXmlText = await zip.file('xl/sharedStrings.xml')?.async('text');
    const strikeStringIds = new Set();
    if (sharedStringsXmlText) {
        const siMatches = sharedStringsXmlText.match(/<si[\s\S]*?<\/si>/gi) || [];
        siMatches.forEach((siXml, strIdx) => {
            if (/<strike\b/i.test(siXml)) {
                strikeStringIds.add(strIdx);
            }
        });
    }

    console.log("Strike Font IDs:", Array.from(strikeFontIds));
    console.log("Strike Style IDs:", Array.from(strikeStyleIds));
    console.log("Strike Shared String IDs:", Array.from(strikeStringIds));

    // 3. Check worksheets for cells using strike styles or strike shared strings
    const sheetFiles = Object.keys(zip.files).filter(f => f.startsWith('xl/worksheets/sheet') && f.endsWith('.xml'));
    const struckOutCells = {}; // sheetName -> Set of cellRefs like "B7" or row indices

    for (const sheetFile of sheetFiles) {
        const sheetXmlText = await zip.file(sheetFile).async('text');
        const cellMatches = sheetXmlText.match(/<c\b[\s\S]*?<\/c>/gi) || [];
        const struckCellsInSheet = new Set();

        cellMatches.forEach(cXml => {
            const rMatch = cXml.match(/r="([A-Z0-9]+)"/i);
            const sMatch = cXml.match(/s="(\d+)"/i);
            const tMatch = cXml.match(/t="s"/i);
            const vMatch = cXml.match(/<v>(\d+)<\/v>/i);

            if (rMatch) {
                const cellRef = rMatch[1];
                let isStruck = false;

                if (sMatch && strikeStyleIds.has(parseInt(sMatch[1], 10))) {
                    isStruck = true;
                }
                if (tMatch && vMatch && strikeStringIds.has(parseInt(vMatch[1], 10))) {
                    isStruck = true;
                }

                if (isStruck) {
                    struckCellsInSheet.add(cellRef);
                }
            }
        });

        struckOutCells[sheetFile] = Array.from(struckCellsInSheet);
    }

    return struckOutCells;
}

// Create a real Excel file with ExcelJS or SheetJS and zip XML structure to test
const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const wsData = [
    ["S. No.", "Name of Member", "Date", "Share Certificate Number", "Number of Shares", "Consideration (USD)", "CURRENCY", "INDIVIDUAL/CORPORATE"],
    [1, "Maran", "12 Sept 2011", 1, 1, 1, "USD", "INDIVIDUAL"],
    [2, "PUSHPA BINDAL", "20 Dec 2012", 2, 199975, 199975, "USD", "INDIVIDUAL"]
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
wb.SheetNames.push("Members");
wb.Sheets["Members"] = ws;
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

testXlsxStrikeout(buf).then(res => console.log("Result:", res));
