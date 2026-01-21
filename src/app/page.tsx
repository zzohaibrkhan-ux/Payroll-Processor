'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, Plus, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ColumnMapping {
  mainHeader: string;
  aliases: string[];
  matchFound: boolean;
  matchSource?: string;
  isFallback: boolean;
  isNewColumn: boolean;
}

interface ProcessingSummary {
  totalColumns: number;
  matchedColumns: number;
  fallbackMatches: number;
  newColumns: number;
  processedSheet: string;
  success: boolean;
  outputFileName: string;
}

export default function Page() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [structureSheet, setStructureSheet] = useState<ColumnMapping[]>([]);
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const loadStructureSheet = useCallback(async () => {
    console.log('Loading structure sheet...');
    try {
      const response = await fetch('/api/payroll/structure');
      console.log('Structure sheet response status:', response.status);
      if (!response.ok) throw new Error('Failed to load structure sheet');
      const data = await response.json();
      setStructureSheet(data.structure);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load structure sheet',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    console.log('File selected:', uploadedFile.name, uploadedFile.size);

    setFile(uploadedFile);
    setLoading(true);
    setSummary(null);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch('/api/payroll/process', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Processing failed: ${errorData.error}`);
      }

      const data = await response.json();
      setStructureSheet(data.structure);
      setSummary(data.summary);

      if (data.outputUrl) {
        setDownloadUrl(data.outputUrl);
      }

      if (data.summary.newColumns > 0) {
        toast({
          title: 'New Columns Added',
          description: `${data.summary.newColumns} new column(s) were added to the structure sheet`,
        });
      }

      if (data.summary.fallbackMatches > 0) {
        toast({
          title: 'Fallback Matches Used',
          description: `${data.summary.fallbackMatches} column(s) matched using fallback rows`,
        });
      }

      toast({
        title: 'Success',
        description: `Processed ${data.summary.totalColumns} columns successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleDownload = useCallback(() => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  }, [downloadUrl]);

  const handleAddColumn = useCallback(async (columnName: string) => {
    try {
      const response = await fetch('/api/payroll/structure/column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnName }),
      });

      if (!response.ok) throw new Error('Failed to add column');

      const data = await response.json();
      setStructureSheet(data.structure);
      toast({
        title: 'Success',
        description: `Column "${columnName}" added to structure sheet`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add column',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    loadStructureSheet();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Payroll Excel Processor
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Upload Excel files and map columns using the structure sheet
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="upload">Upload & Process</TabsTrigger>
            <TabsTrigger value="structure">Structure Sheet</TabsTrigger>
            <TabsTrigger value="results">Results & Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Payroll File
                </CardTitle>
                <CardDescription>
                  Upload an Excel file containing the "Payroll History" sheet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileSpreadsheet className="w-12 h-12 mb-4 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Excel files with "Payroll History" sheet
                      </p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={loading}
                      className="hidden"
                    />
                  </label>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">{file.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    {loading && (
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    )}
                  </div>
                )}

                {summary && downloadUrl && (
                  <div className="flex justify-end">
                    <Button onClick={handleDownload} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download Processed File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structure" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Structure Sheet
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadStructureSheet}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>
                  View and manage column mappings. The first row contains main headers, and rows below contain aliases.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] rounded-md border">
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {structureSheet.map((column, index) => (
                        <Card key={index} className="bg-slate-50 dark:bg-slate-900">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-medium break-all">
                                {column.mainHeader}
                              </CardTitle>
                              <div className="flex gap-1 flex-shrink-0">
                                {column.matchFound && (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Matched
                                  </Badge>
                                )}
                                {column.isNewColumn && (
                                  <Badge variant="secondary" className="text-xs">
                                    New
                                  </Badge>
                                )}
                                {column.isFallback && column.matchFound && (
                                  <Badge variant="outline" className="text-xs">
                                    Fallback
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {column.aliases.length > 0 && (
                              <div className="text-xs">
                                <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Aliases:</p>
                                <div className="flex flex-wrap gap-1">
                                  {column.aliases.map((alias, aliasIndex) => (
                                    <Badge
                                      key={aliasIndex}
                                      variant="outline"
                                      className="text-[10px] h-5"
                                    >
                                      {alias}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {column.matchSource && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-medium">Match Source:</span> {column.matchSource}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {summary ? (
              <div className="space-y-6">
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-900 dark:text-green-100">
                    Processing Complete
                  </AlertTitle>
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    The file has been processed successfully. You can download the output file.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Columns</CardDescription>
                      <CardTitle className="text-3xl">{summary.totalColumns}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Matched Columns</CardDescription>
                      <CardTitle className="text-3xl text-green-600">
                        {summary.matchedColumns}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Fallback Matches</CardDescription>
                      <CardTitle className="text-3xl text-amber-600">
                        {summary.fallbackMatches}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>New Columns Added</CardDescription>
                      <CardTitle className="text-3xl text-blue-600">
                        {summary.newColumns}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Processing Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Processed Sheet:</dt>
                        <dd className="text-sm font-semibold text-slate-900 dark:text-slate-50">{summary.processedSheet}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Output File:</dt>
                        <dd className="text-sm font-semibold text-slate-900 dark:text-slate-50">{summary.outputFileName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Status:</dt>
                        <dd>
                          <Badge variant={summary.success ? 'default' : 'destructive'}>
                            {summary.success ? 'Success' : 'Failed'}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {downloadUrl && (
                  <Button onClick={handleDownload} size="lg" className="w-full gap-2">
                    <Download className="w-5 h-5" />
                    Download Processed File
                  </Button>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Info className="w-16 h-16 text-slate-400 mb-4" />
                  <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                    No processing results yet. Upload a file to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
