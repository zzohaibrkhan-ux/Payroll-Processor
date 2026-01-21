import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    const filePath = join(process.cwd(), 'upload', filename);
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
