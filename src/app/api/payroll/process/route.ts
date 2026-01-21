import { NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const structureFilePath = join(
      process.cwd(),
      'upload',
      'Structure Sheet Payroll Analysis.xlsx'
    );

    const structureBuffer = await readFile(structureFilePath);
    const structure = await processStructureSheet(structureBuffer);

    const { result: processResult, structure: updatedStructure } =
      await processUploadedFile(buffer, structure.structure);

    const outputFileName = `Processed_${Date.now()}_${file.name}`;
    const outputDir = join(process.cwd(), 'upload');

    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, outputFileName);
    await writeFile(outputPath, processResult.outputBuffer);

    return NextResponse.json({
      structure: updatedStructure,
      summary: processResult.summary,
      outputUrl: `/api/payroll/download/${outputFileName}`,
    });
  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}

async function processStructureSheet(buffer: Buffer) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (data.length < 1) {
    throw new Error('Structure sheet is empty');
  }

  const headers = data[0] as string[];
  const structure = [];

  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const mainHeader = headers[colIndex];
    const aliases: string[] = [];

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const cellValue = (data[rowIndex] as any[])[colIndex];
      if (cellValue && typeof cellValue === 'string' && cellValue.trim() !== '') {
        aliases.push(cellValue.trim());
      }
    }

    structure.push({
      mainHeader: mainHeader || `Column_${colIndex + 1}`,
      aliases,
    });
  }

  return { structure };
}

async function processUploadedFile(
  buffer: Buffer,
  structure: Array<{ mainHeader: string; aliases: string[] }>
) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sheetName = workbook.SheetNames.find(
    (name) => name.toLowerCase() === 'payroll history'
  );

  if (!sheetName) {
    throw new Error('Payroll History sheet not found');
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (data.length < 1) {
    throw new Error('Uploaded file is empty');
  }

  const uploadedHeaders = data[0] as string[];
  const columnMapping: { [key: string]: string } = {};
  const newColumns: string[] = [];
  let matchedColumns = 0;
  let fallbackMatches = 0;

  for (const uploadedHeader of uploadedHeaders) {
    let matchFound = false;
    let matchSource = '';
    let isFallback = false;

    for (const structCol of structure) {
      if (structCol.mainHeader === uploadedHeader) {
        columnMapping[uploadedHeader] = structCol.mainHeader;
        matchedColumns++;
        matchFound = true;
        matchSource = 'Main header';
        break;
      }
    }

    if (!matchFound) {
      for (const structCol of structure) {
        for (let i = 0; i < structCol.aliases.length; i++) {
          const alias = structCol.aliases[i];
          if (alias && alias.trim() === uploadedHeader.trim()) {
            columnMapping[uploadedHeader] = structCol.mainHeader;
            matchedColumns++;
            fallbackMatches++;
            matchFound = true;
            isFallback = true;
            matchSource = `Row ${i + 2}`;
            break;
          }
        }
        if (matchFound) break;
      }
    }

    if (!matchFound) {
      newColumns.push(uploadedHeader);
      columnMapping[uploadedHeader] = uploadedHeader;
      structure.push({
        mainHeader: uploadedHeader,
        aliases: [],
      });
    }
  }

  const outputData = data.map((row: any[], rowIndex) => {
    if (rowIndex === 0) {
      const orderedHeaders: string[] = [];
      const seenHeaders = new Set<string>();

      for (const structCol of structure) {
        if (!seenHeaders.has(structCol.mainHeader)) {
          orderedHeaders.push(structCol.mainHeader);
          seenHeaders.add(structCol.mainHeader);
        }
      }

      return orderedHeaders;
    }

    const newRow: any[] = [];
    const seenHeaders = new Set<string>();

    for (const structCol of structure) {
      if (!seenHeaders.has(structCol.mainHeader)) {
        const originalHeader = Object.keys(columnMapping).find(
          (key) => columnMapping[key] === structCol.mainHeader
        );

        if (originalHeader) {
          const originalIndex = uploadedHeaders.indexOf(originalHeader);
          newRow.push(row[originalIndex]);
        } else {
          newRow.push('');
        }

        seenHeaders.add(structCol.mainHeader);
      }
    }

    return newRow;
  });

  const outputWorkbook = XLSX.utils.book_new();
  const outputWorksheet = XLSX.utils.aoa_to_sheet(outputData);
  XLSX.utils.book_append_sheet(outputWorkbook, outputWorksheet, 'Payroll History');
  const outputBuffer = XLSX.write(outputWorkbook, { type: 'buffer', bookType: 'xlsx' });

  const summary = {
    totalColumns: uploadedHeaders.length,
    matchedColumns,
    fallbackMatches,
    newColumns: newColumns.length,
    processedSheet: sheetName,
    success: true,
    outputFileName: 'Processed_Output.xlsx',
  };

  const updatedStructure = structure.map((col) => {
    const mappedKeys = Object.keys(columnMapping);
    const isMapped = mappedKeys.some((key) => columnMapping[key] === col.mainHeader);
    const originalHeader = Object.keys(columnMapping).find(
      (key) => columnMapping[key] === col.mainHeader
    );
    const matchSource = col.mainHeader === originalHeader ? 'Main header' : `Row ${getFallbackRow(col, originalHeader)}`;

    return {
      ...col,
      matchFound: isMapped,
      isFallback: col.mainHeader !== originalHeader,
      matchSource: isMapped ? matchSource : undefined,
      isNewColumn: newColumns.includes(col.mainHeader),
    };
  });

  return {
    result: { outputBuffer, summary },
    structure: updatedStructure,
  };
}

function getFallbackRow(
  structCol: { mainHeader: string; aliases: string[] },
  originalHeader: string | undefined
): string | undefined {
  if (!originalHeader) return undefined;

  for (let i = 0; i < structCol.aliases.length; i++) {
    if (structCol.aliases[i] === originalHeader) {
      return String(i + 2);
    }
  }

  return undefined;
}
