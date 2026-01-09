/**
 * Report Narrative Service
 *
 * Client-side wrapper for the generate-report-narrative Edge Function
 */

import { supabase } from './supabase';

export interface ReportContext {
    totalRisks: number;
    highExtremeCount: number;
    avgResidualScore: number;
    controlEffectiveness: number;
    topRisks: Array<{
        risk_code: string;
        risk_title: string;
        category: string;
        level: string;
    }>;
    periodName: string;
    comparisonPeriodName?: string;
    incidentCount?: number;
    kriBreeches?: number;
}

export interface NarrativeResponse {
    executiveSummary: string;
    recommendations: string[];
}

/**
 * Generate AI narrative for a report
 */
export async function generateReportNarrative(
    reportType: 'ceo' | 'board' | 'regulatory',
    context: ReportContext,
    regulator?: 'cbn' | 'sec' | 'pencom'
): Promise<NarrativeResponse> {
    const { data, error } = await supabase.functions.invoke('generate-report-narrative', {
        body: {
            reportType,
            context,
            regulator,
        },
    });

    if (error) {
        console.error('Error generating narrative:', error);
        throw new Error(error.message || 'Failed to generate narrative');
    }

    return data as NarrativeResponse;
}
