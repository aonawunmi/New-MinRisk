import { supabase } from './supabase';
// ============================================================================
// CSV EXPORT
// ============================================================================
/**
 * Export risks to CSV format
 */
export async function exportRisksToCSV(options) {
    try {
        // Fetch risks (RLS will auto-filter by user/org)
        let query = supabase.from('risks').select('*').order('risk_code');
        // Apply filters if provided
        if (options?.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }
        const { data: risks, error } = await query;
        if (error) {
            console.error('Export risks fetch error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        if (!risks || risks.length === 0) {
            return { data: null, error: new Error('No risks to export') };
        }
        // Define CSV columns
        const columns = options?.includeColumns || [
            'risk_code',
            'risk_title',
            'risk_description',
            'division',
            'department',
            'category',
            'owner',
            'likelihood_inherent',
            'impact_inherent',
            'status',
            'period',
            'is_priority',
        ];
        // Create CSV header
        const header = columns.join(',');
        // Create CSV rows
        const rows = risks.map((risk) => {
            return columns
                .map((col) => {
                const value = risk[col];
                // Handle values with commas, quotes, or newlines
                if (value === null || value === undefined)
                    return '';
                const stringValue = String(value);
                if (stringValue.includes(',') ||
                    stringValue.includes('"') ||
                    stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            })
                .join(',');
        });
        // Combine header and rows
        const csv = [header, ...rows].join('\n');
        console.log(`Exported ${risks.length} risks to CSV`);
        return { data: csv, error: null };
    }
    catch (err) {
        console.error('Unexpected export risks to CSV error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Download CSV file to user's browser
 */
export function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('CSV file downloaded:', filename);
}
// ============================================================================
// CSV IMPORT
// ============================================================================
/**
 * Parse CSV content
 */
function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
        return { headers: [], rows: [] };
    }
    // Parse header
    const headers = lines[0]
        .split(',')
        .map((h) => h.trim().replace(/^"|"$/g, ''));
    // Parse rows
    const rows = lines.slice(1).map((line, index) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row = { _rowNumber: index + 2 }; // +2 for header and 1-based
        headers.forEach((header, i) => {
            row[header] = values[i] || null;
        });
        return row;
    });
    return { headers, rows };
}
/**
 * Validate risk row data
 */
function validateRiskRow(row, rowNumber) {
    const errors = [];
    // Required fields
    const requiredFields = [
        'risk_code',
        'risk_title',
        'division',
        'category',
        'likelihood_inherent',
        'impact_inherent',
    ];
    requiredFields.forEach((field) => {
        if (!row[field] || String(row[field]).trim() === '') {
            errors.push({
                row: rowNumber,
                field,
                message: `Required field '${field}' is missing or empty`,
                data: row,
            });
        }
    });
    // Validate likelihood and impact (1-5)
    const likelihood = parseInt(row.likelihood_inherent);
    const impact = parseInt(row.impact_inherent);
    if (isNaN(likelihood) || likelihood < 1 || likelihood > 5) {
        errors.push({
            row: rowNumber,
            field: 'likelihood_inherent',
            message: 'Likelihood must be a number between 1 and 5',
            data: row,
        });
    }
    if (isNaN(impact) || impact < 1 || impact > 5) {
        errors.push({
            row: rowNumber,
            field: 'impact_inherent',
            message: 'Impact must be a number between 1 and 5',
            data: row,
        });
    }
    // Validate status if provided
    if (row.status) {
        const validStatuses = ['OPEN', 'MONITORING', 'CLOSED', 'ARCHIVED'];
        if (!validStatuses.includes(row.status)) {
            errors.push({
                row: rowNumber,
                field: 'status',
                message: `Status must be one of: ${validStatuses.join(', ')}`,
                data: row,
            });
        }
    }
    // Validate is_priority if provided
    if (row.is_priority !== undefined && row.is_priority !== null) {
        const boolValue = String(row.is_priority).toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
            errors.push({
                row: rowNumber,
                field: 'is_priority',
                message: 'is_priority must be true/false or yes/no',
                data: row,
            });
        }
    }
    return errors;
}
/**
 * Transform CSV row to risk data
 */
function transformCSVRowToRisk(row) {
    // Convert is_priority string to boolean
    let isPriority = false;
    if (row.is_priority) {
        const boolValue = String(row.is_priority).toLowerCase();
        isPriority = ['true', '1', 'yes'].includes(boolValue);
    }
    return {
        risk_code: row.risk_code,
        risk_title: row.risk_title,
        risk_description: row.risk_description || null,
        division: row.division,
        department: row.department || null,
        category: row.category,
        owner: row.owner || null,
        likelihood_inherent: parseInt(row.likelihood_inherent),
        impact_inherent: parseInt(row.impact_inherent),
        status: row.status || 'OPEN',
        period: row.period || null,
        is_priority: isPriority,
    };
}
/**
 * Import risks from CSV content
 */
export async function importRisksFromCSV(csvContent) {
    try {
        // Get current user and org
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            return { data: null, error: new Error('User profile not found') };
        }
        // Parse CSV
        const { headers, rows } = parseCSV(csvContent);
        if (rows.length === 0) {
            return {
                data: null,
                error: new Error('CSV file is empty or invalid'),
            };
        }
        // Validate all rows first
        const allErrors = [];
        rows.forEach((row) => {
            const rowErrors = validateRiskRow(row, row._rowNumber);
            allErrors.push(...rowErrors);
        });
        // If there are validation errors, return them without importing
        if (allErrors.length > 0) {
            return {
                data: {
                    success: false,
                    total: rows.length,
                    imported: 0,
                    skipped: rows.length,
                    errors: allErrors,
                },
                error: null,
            };
        }
        // Transform and import rows
        let imported = 0;
        let skipped = 0;
        const errors = [];
        for (const row of rows) {
            try {
                const riskData = transformCSVRowToRisk(row);
                // Check if risk_code already exists
                const { data: existing, error: checkError } = await supabase
                    .from('risks')
                    .select('id')
                    .eq('risk_code', riskData.risk_code)
                    .single();
                if (existing) {
                    // Risk already exists, skip
                    skipped++;
                    errors.push({
                        row: row._rowNumber,
                        field: 'risk_code',
                        message: `Risk code '${riskData.risk_code}' already exists`,
                        data: row,
                    });
                    continue;
                }
                // Insert risk
                const { error: insertError } = await supabase.from('risks').insert([
                    {
                        ...riskData,
                        organization_id: profile.organization_id,
                        user_id: user.id,
                        owner_profile_id: user.id,
                    },
                ]);
                if (insertError) {
                    skipped++;
                    errors.push({
                        row: row._rowNumber,
                        message: insertError.message,
                        data: row,
                    });
                }
                else {
                    imported++;
                }
            }
            catch (err) {
                skipped++;
                errors.push({
                    row: row._rowNumber,
                    message: err instanceof Error ? err.message : 'Unknown error',
                    data: row,
                });
            }
        }
        const result = {
            success: imported > 0,
            total: rows.length,
            imported,
            skipped,
            errors,
        };
        console.log('Import complete:', result);
        return { data: result, error: null };
    }
    catch (err) {
        console.error('Unexpected import risks from CSV error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Preview CSV import without actually importing
 */
export async function previewCSVImport(csvContent) {
    try {
        // Parse CSV
        const { headers, rows } = parseCSV(csvContent);
        if (rows.length === 0) {
            return {
                data: null,
                error: new Error('CSV file is empty or invalid'),
            };
        }
        // Validate all rows
        const allErrors = [];
        rows.forEach((row) => {
            const rowErrors = validateRiskRow(row, row._rowNumber);
            allErrors.push(...rowErrors);
        });
        const invalidRows = new Set(allErrors.map((e) => e.row));
        const validRows = rows.length - invalidRows.size;
        // Get preview of first 10 valid rows
        const preview = rows
            .filter((row) => !invalidRows.has(row._rowNumber))
            .slice(0, 10);
        return {
            data: {
                total: rows.length,
                validRows,
                invalidRows: invalidRows.size,
                errors: allErrors,
                preview,
            },
            error: null,
        };
    }
    catch (err) {
        console.error('Unexpected preview CSV import error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
// ============================================================================
// EXCEL EXPORT (Placeholder - requires xlsx.js)
// ============================================================================
/**
 * Export risks to Excel format
 * NOTE: This requires the XLSX.js library to be installed
 */
export async function exportRisksToExcel(options) {
    try {
        // For now, return CSV as fallback
        // In production, use XLSX.js to create proper Excel file
        const { data: csvData, error } = await exportRisksToCSV(options);
        if (error || !csvData) {
            return { data: null, error: error || new Error('Export failed') };
        }
        // Convert CSV to Blob
        const blob = new Blob([csvData], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        console.log('Excel export created (CSV fallback)');
        return { data: blob, error: null };
    }
    catch (err) {
        console.error('Unexpected export risks to Excel error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
/**
 * Download Excel file to user's browser
 */
export function downloadExcel(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('Excel file downloaded:', filename);
}
// ============================================================================
// TEMPLATE GENERATION
// ============================================================================
/**
 * Generate a CSV template for risk import
 */
export function generateRiskImportTemplate() {
    const headers = [
        'risk_code',
        'risk_title',
        'risk_description',
        'division',
        'department',
        'category',
        'owner',
        'likelihood_inherent',
        'impact_inherent',
        'status',
        'period',
        'is_priority',
    ];
    const exampleRow = [
        'OPS-TEC-001',
        'Cybersecurity Breach',
        'Risk of data breach from external attack',
        'Operations',
        'IT',
        'Technology',
        'CTO',
        '4',
        '5',
        'OPEN',
        'Q1 2025',
        'true',
    ];
    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    return csv;
}
/**
 * Download risk import template
 */
export function downloadRiskImportTemplate() {
    const template = generateRiskImportTemplate();
    downloadCSV(template, 'minrisk_import_template.csv');
}
// ============================================================================
// CONTROLS CSV EXPORT
// ============================================================================
/**
 * Export controls to CSV format
 */
export async function exportControlsToCSV(options) {
    try {
        // Fetch controls with risk information (RLS will auto-filter by user/org)
        let query = supabase
            .from('controls')
            .select(`
        *,
        risks:risk_id (
          risk_code,
          risk_title
        )
      `)
            .order('control_code');
        // Apply filters if provided
        if (options?.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }
        const { data: controls, error } = await query;
        if (error) {
            console.error('Export controls fetch error:', error.message);
            return { data: null, error: new Error(error.message) };
        }
        if (!controls || controls.length === 0) {
            return { data: null, error: new Error('No controls to export') };
        }
        // Define CSV columns
        const columns = options?.includeColumns || [
            'control_code',
            'risk_code',
            'name',
            'description',
            'control_type',
            'target',
            'design_score',
            'implementation_score',
            'monitoring_score',
            'evaluation_score',
        ];
        // Create CSV header
        const header = columns.join(',');
        // Create CSV rows
        const rows = controls.map((control) => {
            return columns
                .map((col) => {
                // Special handling for risk_code
                if (col === 'risk_code') {
                    const riskCode = control.risks?.risk_code || '';
                    return riskCode;
                }
                const value = control[col];
                // Handle values with commas, quotes, or newlines
                if (value === null || value === undefined)
                    return '';
                const stringValue = String(value);
                if (stringValue.includes(',') ||
                    stringValue.includes('"') ||
                    stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            })
                .join(',');
        });
        // Combine header and rows
        const csv = [header, ...rows].join('\n');
        console.log(`Exported ${controls.length} controls to CSV`);
        return { data: csv, error: null };
    }
    catch (err) {
        console.error('Unexpected export controls to CSV error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
// ============================================================================
// CONTROLS CSV IMPORT
// ============================================================================
/**
 * Validate control row data
 */
function validateControlRow(row, rowNumber) {
    const errors = [];
    // Required fields
    const requiredFields = ['risk_code', 'name', 'target'];
    requiredFields.forEach((field) => {
        if (!row[field] || String(row[field]).trim() === '') {
            errors.push({
                row: rowNumber,
                field,
                message: `Required field '${field}' is missing or empty`,
                data: row,
            });
        }
    });
    // Validate control_type if provided
    if (row.control_type) {
        const validTypes = ['preventive', 'detective', 'corrective'];
        if (!validTypes.includes(row.control_type)) {
            errors.push({
                row: rowNumber,
                field: 'control_type',
                message: `Control type must be one of: ${validTypes.join(', ')}`,
                data: row,
            });
        }
    }
    // Validate target
    if (row.target) {
        const validTargets = ['Likelihood', 'Impact'];
        if (!validTargets.includes(row.target)) {
            errors.push({
                row: rowNumber,
                field: 'target',
                message: `Target must be one of: ${validTargets.join(', ')} (capitalized)`,
                data: row,
            });
        }
    }
    // Validate DIME scores (0-3) if provided
    const dimeFields = [
        'design_score',
        'implementation_score',
        'monitoring_score',
        'evaluation_score',
    ];
    dimeFields.forEach((field) => {
        if (row[field] !== null && row[field] !== undefined && row[field] !== '') {
            const score = parseInt(row[field]);
            if (isNaN(score) || score < 0 || score > 3) {
                errors.push({
                    row: rowNumber,
                    field,
                    message: `${field} must be a number between 0 and 3`,
                    data: row,
                });
            }
        }
    });
    return errors;
}
/**
 * Transform CSV row to control data
 */
async function transformCSVRowToControl(row, organizationId) {
    try {
        // Lookup risk_id from risk_code
        const { data: risk, error: riskError } = await supabase
            .from('risks')
            .select('id')
            .eq('risk_code', row.risk_code)
            .eq('organization_id', organizationId)
            .single();
        if (riskError || !risk) {
            return {
                data: null,
                error: `Risk code '${row.risk_code}' not found in your organization`,
            };
        }
        // Parse DIME scores (null if empty)
        const parseScore = (value) => {
            if (value === null || value === undefined || value === '')
                return null;
            const score = parseInt(value);
            return isNaN(score) ? null : score;
        };
        return {
            data: {
                risk_id: risk.id,
                control_code: row.control_code || null, // Will be auto-generated if null
                name: row.name,
                description: row.description || null,
                control_type: row.control_type || null,
                target: row.target,
                design_score: parseScore(row.design_score),
                implementation_score: parseScore(row.implementation_score),
                monitoring_score: parseScore(row.monitoring_score),
                evaluation_score: parseScore(row.evaluation_score),
            },
            error: null,
        };
    }
    catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}
/**
 * Import controls from CSV content
 */
export async function importControlsFromCSV(csvContent) {
    try {
        // Get current user and org
        const { data: { user }, error: userError, } = await supabase.auth.getUser();
        if (userError || !user) {
            return { data: null, error: new Error('User not authenticated') };
        }
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            return { data: null, error: new Error('User profile not found') };
        }
        // Parse CSV
        const { headers, rows } = parseCSV(csvContent);
        if (rows.length === 0) {
            return {
                data: null,
                error: new Error('CSV file is empty or invalid'),
            };
        }
        // Validate all rows first
        const allErrors = [];
        rows.forEach((row) => {
            const rowErrors = validateControlRow(row, row._rowNumber);
            allErrors.push(...rowErrors);
        });
        // If there are validation errors, return them without importing
        if (allErrors.length > 0) {
            return {
                data: {
                    success: false,
                    total: rows.length,
                    imported: 0,
                    skipped: rows.length,
                    errors: allErrors,
                },
                error: null,
            };
        }
        // Transform and import rows
        let imported = 0;
        let skipped = 0;
        const errors = [];
        for (const row of rows) {
            try {
                const { data: controlData, error: transformError } = await transformCSVRowToControl(row, profile.organization_id);
                if (transformError || !controlData) {
                    skipped++;
                    errors.push({
                        row: row._rowNumber,
                        message: transformError || 'Failed to transform row',
                        data: row,
                    });
                    continue;
                }
                // Check if control_code already exists (if provided)
                if (controlData.control_code) {
                    const { data: existing, error: checkError } = await supabase
                        .from('controls')
                        .select('id')
                        .eq('control_code', controlData.control_code)
                        .single();
                    if (existing) {
                        // Control already exists, skip
                        skipped++;
                        errors.push({
                            row: row._rowNumber,
                            field: 'control_code',
                            message: `Control code '${controlData.control_code}' already exists`,
                            data: row,
                        });
                        continue;
                    }
                }
                // Insert control (control_code will be auto-generated if null)
                const { error: insertError } = await supabase.from('controls').insert([
                    {
                        ...controlData,
                        organization_id: profile.organization_id,
                        created_by_profile_id: user.id,
                    },
                ]);
                if (insertError) {
                    skipped++;
                    errors.push({
                        row: row._rowNumber,
                        message: insertError.message,
                        data: row,
                    });
                }
                else {
                    imported++;
                }
            }
            catch (err) {
                skipped++;
                errors.push({
                    row: row._rowNumber,
                    message: err instanceof Error ? err.message : 'Unknown error',
                    data: row,
                });
            }
        }
        const result = {
            success: imported > 0,
            total: rows.length,
            imported,
            skipped,
            errors,
        };
        console.log('Controls import complete:', result);
        return { data: result, error: null };
    }
    catch (err) {
        console.error('Unexpected import controls from CSV error:', err);
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error'),
        };
    }
}
// ============================================================================
// CONTROLS TEMPLATE GENERATION
// ============================================================================
/**
 * Generate a CSV template for control import
 */
export function generateControlImportTemplate() {
    const headers = [
        'control_code',
        'risk_code',
        'name',
        'description',
        'control_type',
        'target',
        'design_score',
        'implementation_score',
        'monitoring_score',
        'evaluation_score',
    ];
    const exampleRow = [
        'CTRL-001',
        'OPS-TEC-001',
        'Multi-Factor Authentication',
        'Implement MFA for all system access',
        'preventive',
        'Likelihood',
        '3',
        '3',
        '2',
        '2',
    ];
    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    return csv;
}
/**
 * Download control import template
 */
export function downloadControlImportTemplate() {
    const template = generateControlImportTemplate();
    downloadCSV(template, 'minrisk_controls_import_template.csv');
}
