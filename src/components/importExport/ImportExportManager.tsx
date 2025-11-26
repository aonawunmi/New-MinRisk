/**
 * ImportExportManager Component
 *
 * CSV import/export for risks and controls with validation and preview
 */

import { useState } from 'react';
import {
  exportRisksToCSV,
  exportControlsToCSV,
  downloadCSV,
  importRisksFromCSV,
  importControlsFromCSV,
  previewCSVImport,
  downloadRiskImportTemplate,
  downloadControlImportTemplate,
  type ImportResult,
} from '@/lib/importExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ImportExportManagerProps {
  mode: 'risks' | 'controls';
}

export default function ImportExportManager({ mode }: ImportExportManagerProps) {
  const entityName = mode === 'risks' ? 'Risks' : 'Controls';
  const entityNameLower = entityName.toLowerCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import / Export {entityName}</h2>
        <p className="text-gray-600 text-sm mt-1">
          Import {entityNameLower} from CSV or export current {entityNameLower} to CSV
        </p>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList>
          <TabsTrigger value="export">📤 Export</TabsTrigger>
          <TabsTrigger value="import">📥 Import</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="mt-6">
          <ExportView mode={mode} />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <ImportView mode={mode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExportView({ mode }: { mode: 'risks' | 'controls' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const entityName = mode === 'risks' ? 'Risks' : 'Controls';
  const entityNameLower = entityName.toLowerCase();

  async function handleExport() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = mode === 'risks'
        ? await exportRisksToCSV()
        : await exportControlsToCSV();

      if (result.error) throw new Error(result.error.message);
      if (!result.data) throw new Error('No data to export');

      const filename = `minrisk_${mode}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(result.data, filename);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export {entityName} to CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          Export all your {entityNameLower} to a CSV file for backup, analysis, or migration.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {entityName} exported successfully!
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleExport} disabled={loading}>
          {loading ? 'Exporting...' : `📤 Export All ${entityName}`}
        </Button>
      </CardContent>
    </Card>
  );
}

function ImportView({ mode }: { mode: 'risks' | 'controls' }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entityName = mode === 'risks' ? 'Risks' : 'Controls';
  const entityNameLower = entityName.toLowerCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);
    setImportResult(null);
    setError(null);

    // Preview
    const content = await selectedFile.text();
    const result = await previewCSVImport(content);

    if (result.error) {
      setError(result.error.message);
    } else {
      setPreview(result.data);
    }
  }

  async function handleImport() {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const content = await file.text();
      const result = mode === 'risks'
        ? await importRisksFromCSV(content)
        : await importControlsFromCSV(content);

      if (result.error) throw new Error(result.error.message);
      setImportResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle>Download Template</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Download a CSV template with the correct format and sample data
          </p>
          <Button
            variant="outline"
            onClick={mode === 'risks' ? downloadRiskImportTemplate : downloadControlImportTemplate}
          >
            📥 Download Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Import {entityName} from CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-2">Preview</h4>
              <div className="space-y-1 text-sm">
                <p>Total rows: {preview.total}</p>
                <p className="text-green-600">Valid rows: {preview.validRows}</p>
                {preview.invalidRows > 0 && (
                  <p className="text-red-600">Invalid rows: {preview.invalidRows}</p>
                )}
              </div>

              {preview.errors.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-red-600 mb-1">Errors:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {preview.errors.slice(0, 10).map((err: any, i: number) => (
                      <p key={i} className="text-xs text-red-600">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {preview.validRows > 0 && (
                <Button
                  className="mt-4"
                  onClick={handleImport}
                  disabled={loading}
                >
                  {loading ? 'Importing...' : `Import ${preview.validRows} Valid ${entityName}`}
                </Button>
              )}
            </div>
          )}

          {importResult && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                <p className="font-semibold">Import Complete!</p>
                <p className="mt-1">
                  Imported: {importResult.imported} | Skipped: {importResult.skipped}
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
