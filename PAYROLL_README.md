# Payroll Excel Processing System

A Structure Sheet-based Excel processing system that normalizes uploaded payroll files into a standardized format.

## Features

- **File Upload**: Upload Excel files containing "Payroll History" sheet
- **Structure Sheet Management**: View and manage column mappings with main headers and aliases
- **Column Matching Logic**:
  - Primary match against main headers (Row 1)
  - Fallback matches against aliases in subsequent rows (Row 2, 3, 4, etc.)
  - Automatic new column addition when no match is found
- **Output Generation**: Generates processed Excel files with standardized column structure
- **Summary Reports**: Detailed statistics on matches, fallbacks, and new columns
- **User Notifications**: Toast notifications for processing status

## How It Works

### Structure Sheet

The Structure Sheet (located at `upload/Structure Sheet Payroll Analysis.xlsx`) defines the column mapping logic:

- **Row 1 (Main Headers)**: Standardized output column names
- **Rows 2+ (Aliases)**: Alternative column names that may appear in uploaded files

Example structure:
```
| Sr. No | eecode          | eename       | FILE NUMBER  | ... |
|---------|-----------------|--------------|--------------|-----|
| DRGN    | POSITION ID     | NAME         | FILE NUMBER  | ... |
| MPDL    | POSITION ID     | NAME         | FILE NUMBER  | ... |
```

### Column Matching Process

For each column in the uploaded file:

1. **Primary Match**: Check if column name matches any main header (Row 1)
2. **Fallback Match**: If no primary match, check Row 2, then Row 3, etc.
3. **New Column**: If no match found, automatically add as new column to structure sheet

### Processing Flow

```
Upload File → Match Columns → Map Data → Generate Output → Download
```

## API Endpoints

### GET `/api/payroll/structure`
Returns the current structure sheet with column mappings.

**Response:**
```json
{
  "structure": [
    {
      "mainHeader": "eecode",
      "aliases": ["POSITION ID", "Employee Code"],
      "matchFound": false,
      "isFallback": false,
      "isNewColumn": false
    }
  ]
}
```

### POST `/api/payroll/process`
Processes an uploaded Excel file.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "structure": [...],
  "summary": {
    "totalColumns": 66,
    "matchedColumns": 64,
    "fallbackMatches": 8,
    "newColumns": 2,
    "processedSheet": "Payroll History",
    "success": true,
    "outputFileName": "Processed_Output.xlsx"
  },
  "outputUrl": "/api/payroll/download/Processed_1234567890_filename.xlsx"
}
```

### POST `/api/payroll/structure/column`
Adds a new column to the structure sheet.

**Request:**
```json
{
  "columnName": "New Column Name"
}
```

### GET `/api/payroll/download/[filename]`
Downloads a processed Excel file.

## Usage

1. **Upload File**: Click to upload or drag and drop an Excel file
2. **View Structure**: Switch to "Structure Sheet" tab to view column mappings
3. **Check Results**: Switch to "Results & Summary" tab for processing details
4. **Download**: Click "Download Processed File" to get the normalized output

## Technology Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Excel Processing**: xlsx library
- **Icons**: Lucide React

## File Locations

- Structure Sheet: `upload/Structure Sheet Payroll Analysis.xlsx`
- Uploaded Files: `upload/`
- Processed Files: `upload/Processed_*.xlsx`

## Notes

- The system only processes sheets named "Payroll History"
- All processing is done server-side for security
- New columns are automatically saved to the structure sheet
- Original data is preserved; only column names are reordered and normalized
