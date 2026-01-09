/**
 * PDF Export Utility
 *
 * Exports report components to PDF using html2pdf.js
 */

import html2pdf from 'html2pdf.js';

export interface PDFExportOptions {
    filename: string;
    margin?: number;
    pageSize?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
}

/**
 * Export an HTML element to PDF
 */
export async function exportToPDF(
    element: HTMLElement,
    options: PDFExportOptions
): Promise<void> {
    const {
        filename,
        margin = 10,
        pageSize = 'a4',
        orientation = 'portrait',
    } = options;

    const opt = {
        margin,
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
        },
        jsPDF: {
            unit: 'mm' as const,
            format: pageSize,
            orientation,
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as const },
    };

    await html2pdf().set(opt).from(element).save();
}

/**
 * Generate a filename for a report
 */
export function generateReportFilename(
    reportType: 'ceo' | 'board' | 'regulatory',
    periodName: string,
    regulator?: string
): string {
    const date = new Date().toISOString().split('T')[0];
    const periodSlug = periodName.replace(/\s+/g, '-').toLowerCase();

    switch (reportType) {
        case 'ceo':
            return `CEO-Risk-Summary_${periodSlug}_${date}`;
        case 'board':
            return `Board-Risk-Committee-Report_${periodSlug}_${date}`;
        case 'regulatory':
            return `${regulator?.toUpperCase() || 'REG'}-Compliance-Report_${periodSlug}_${date}`;
        default:
            return `Risk-Report_${date}`;
    }
}
