/**
 * Incident Management Module - TypeScript Types
 * Matches database schema from PHASE-1-SCHEMA-MIGRATION.sql
 */
// ============================================================
// CONSTANTS
// ============================================================
export const SEVERITY_OPTIONS = [
    { value: 'LOW', label: 'Low', color: 'text-blue-600' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
    { value: 'HIGH', label: 'High', color: 'text-orange-600' },
    { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
];
export const STATUS_OPTIONS = [
    { value: 'OPEN', label: 'Open', color: 'bg-blue-100 text-blue-800' },
    { value: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-800' },
    { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
    { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];
export const VISIBILITY_OPTIONS = [
    {
        value: 'REPORTER_ONLY',
        label: 'Reporter Only',
        description: 'Only you and administrators can view this incident'
    },
    {
        value: 'DEPARTMENT',
        label: 'Department',
        description: 'All users in your department can view (coming soon)'
    },
    {
        value: 'INSTITUTION',
        label: 'Institution',
        description: 'All users in your organization can view (coming soon)'
    },
];
// Helper functions
export const getSeverityColor = (severity) => {
    return SEVERITY_OPTIONS.find(opt => opt.value === severity)?.color || 'text-gray-600';
};
export const getStatusBadgeClass = (status) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || 'bg-gray-100 text-gray-800';
};
