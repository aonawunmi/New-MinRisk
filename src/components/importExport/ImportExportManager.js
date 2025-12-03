import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * ImportExportManager Component
 *
 * CSV import/export for risks and controls with validation and preview
 */
import { useState } from 'react';
import { exportRisksToCSV, exportControlsToCSV, downloadCSV, importRisksFromCSV, importControlsFromCSV, previewCSVImport, downloadRiskImportTemplate, downloadControlImportTemplate, } from '@/lib/importExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
export default function ImportExportManager({ mode }) {
    const entityName = mode === 'risks' ? 'Risks' : 'Controls';
    const entityNameLower = entityName.toLowerCase();
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-bold", children: ["Import / Export ", entityName] }), _jsxs("p", { className: "text-gray-600 text-sm mt-1", children: ["Import ", entityNameLower, " from CSV or export current ", entityNameLower, " to CSV"] })] }), _jsxs(Tabs, { defaultValue: "export", className: "w-full", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "export", children: "\uD83D\uDCE4 Export" }), _jsx(TabsTrigger, { value: "import", children: "\uD83D\uDCE5 Import" })] }), _jsx(TabsContent, { value: "export", className: "mt-6", children: _jsx(ExportView, { mode: mode }) }), _jsx(TabsContent, { value: "import", className: "mt-6", children: _jsx(ImportView, { mode: mode }) })] })] }));
}
function ExportView({ mode }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
            if (result.error)
                throw new Error(result.error.message);
            if (!result.data)
                throw new Error('No data to export');
            const filename = `minrisk_${mode}_${new Date().toISOString().split('T')[0]}.csv`;
            downloadCSV(result.data, filename);
            setSuccess(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Export ", entityName, " to CSV"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("p", { className: "text-gray-600", children: ["Export all your ", entityNameLower, " to a CSV file for backup, analysis, or migration."] }), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), success && (_jsx(Alert, { className: "border-green-200 bg-green-50", children: _jsxs(AlertDescription, { className: "text-green-800", children: [entityName, " exported successfully!"] }) })), _jsx(Button, { onClick: handleExport, disabled: loading, children: loading ? 'Exporting...' : `📤 Export All ${entityName}` })] })] }));
}
function ImportView({ mode }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const entityName = mode === 'risks' ? 'Risks' : 'Controls';
    const entityNameLower = entityName.toLowerCase();
    async function handleFileChange(e) {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile)
            return;
        setFile(selectedFile);
        setPreview(null);
        setImportResult(null);
        setError(null);
        // Preview
        const content = await selectedFile.text();
        const result = await previewCSVImport(content);
        if (result.error) {
            setError(result.error.message);
        }
        else {
            setPreview(result.data);
        }
    }
    async function handleImport() {
        if (!file)
            return;
        setLoading(true);
        setError(null);
        try {
            const content = await file.text();
            const result = mode === 'risks'
                ? await importRisksFromCSV(content)
                : await importControlsFromCSV(content);
            if (result.error)
                throw new Error(result.error.message);
            setImportResult(result.data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Download Template" }) }), _jsxs(CardContent, { children: [_jsx("p", { className: "text-gray-600 mb-4", children: "Download a CSV template with the correct format and sample data" }), _jsx(Button, { variant: "outline", onClick: mode === 'risks' ? downloadRiskImportTemplate : downloadControlImportTemplate, children: "\uD83D\uDCE5 Download Template" })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Import ", entityName, " from CSV"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx("div", { children: _jsx("input", { type: "file", accept: ".csv", onChange: handleFileChange, className: "block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" }) }), error && (_jsx(Alert, { variant: "destructive", children: _jsx(AlertDescription, { children: error }) })), preview && (_jsxs("div", { className: "border rounded-lg p-4 bg-gray-50", children: [_jsx("h4", { className: "font-semibold mb-2", children: "Preview" }), _jsxs("div", { className: "space-y-1 text-sm", children: [_jsxs("p", { children: ["Total rows: ", preview.total] }), _jsxs("p", { className: "text-green-600", children: ["Valid rows: ", preview.validRows] }), preview.invalidRows > 0 && (_jsxs("p", { className: "text-red-600", children: ["Invalid rows: ", preview.invalidRows] }))] }), preview.errors.length > 0 && (_jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "font-semibold text-red-600 mb-1", children: "Errors:" }), _jsx("div", { className: "max-h-40 overflow-y-auto space-y-1", children: preview.errors.slice(0, 10).map((err, i) => (_jsxs("p", { className: "text-xs text-red-600", children: ["Row ", err.row, ": ", err.message] }, i))) })] })), preview.validRows > 0 && (_jsx(Button, { className: "mt-4", onClick: handleImport, disabled: loading, children: loading ? 'Importing...' : `Import ${preview.validRows} Valid ${entityName}` }))] })), importResult && (_jsx(Alert, { className: "border-green-200 bg-green-50", children: _jsxs(AlertDescription, { className: "text-green-800", children: [_jsx("p", { className: "font-semibold", children: "Import Complete!" }), _jsxs("p", { className: "mt-1", children: ["Imported: ", importResult.imported, " | Skipped: ", importResult.skipped] })] }) }))] })] })] }));
}
