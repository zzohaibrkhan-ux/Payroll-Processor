import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const { columnName } = await request.json();

    if (!columnName || typeof columnName !== 'string') {
      return NextResponse.json(
        { error: 'Invalid column name' },
        { status: 400 }
      );
    }

    const structureFilePath = join(
      process.cwd(),
      'upload',
      'Structure Sheet Payroll Analysis.xlsx'
    );

    const buffer = await readFile(structureFilePath);
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 1) {
      throw new Error('Structure sheet is empty');
    }

    const headers = data[0] as string[];

    if (headers.includes(columnName)) {
      return NextResponse.json(
        { error: 'Column already exists' },
        { status: 400 }
      );
    }

    headers.push(columnName);

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      if (!data[rowIndex]) {
        data[rowIndex] = [];
      }
      (data[rowIndex] as any[]).push('');
    }

    const newWorksheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets[sheetName] = newWorksheet;

    const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    await writeFile(structureFilePath, Buffer.from(newBuffer));

    const result = await processStructureSheet(newBuffer);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding column:', error);
    return NextResponse.json(
      { error: 'Failed to add column' },
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
      matchFound: false,
      isFallback: false,
      isNewColumn: false,
    });
  }

  return { structure };
}
