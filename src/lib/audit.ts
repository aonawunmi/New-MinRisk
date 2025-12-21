/**
 * Audit Trail Library
 *
 * Functions for loading and logging audit trail entries.
 *
 * Automatic Logging:
 * - Risks, Controls, User Profiles are logged automatically via database triggers
 * - No manual logging needed for these entities
 *
 * Manual Logging:
 * - Use logAuditEntry() for actions not covered by triggers
 * - Examples: approve/reject user, archive risk, bulk operations
 */

import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================

export type AuditTrailEntry = {
  id: string;
  organization_id: string;
  user_id: string;
  user_email?: string; // Populated by join
  action_type: string; // create, update, delete, archive, restore, approve, reject, etc.
  entity_type: string; // risk, control, user, incident, kri, config, etc.
  entity_id: string | null;
  entity_code: string | null;
  old_values: any; // JSONB - before state
  new_values: any; // JSONB - after state
  metadata: any; // JSONB - additional context
  ip_address: string | null;
  user_agent: string | null;
  performed_at: string; // ISO timestamp
};

export type AuditFilters = {
  search?: string; // Search in user_email, entity_code, action_type
  riskCode?: string; // Filter by specific risk code
  userEmail?: string; // Filter by specific user
  actionType?: string; // Filter by action type
  entityType?: string; // Filter by entity type
  excludeEntityTypes?: string[]; // Exclude specific entity types (e.g., ['user'] for system audit)
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  limit?: number; // Max entries to return (default 100)
};

// =====================================================
// LOAD AUDIT TRAIL
// =====================================================

/**
 * Load audit trail entries with optional filters
 *
 * @param filters - Optional filters for searching and filtering
 * @returns Array of audit trail entries with user emails populated
 */
export async function loadAuditTrail(filters: AuditFilters = {}): Promise<AuditTrailEntry[]> {
  try {
    const {
      search,
      riskCode,
      userEmail,
      actionType,
      entityType,
      excludeEntityTypes,
      startDate,
      endDate,
      limit = 100,
    } = filters;

    // Build query
    let query = supabase
      .from('audit_trail')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (riskCode) {
      query = query.eq('entity_code', riskCode);
    }

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    // Exclude specific entity types (e.g., exclude 'user' for system audit)
    if (excludeEntityTypes && excludeEntityTypes.length > 0) {
      query = query.not('entity_type', 'in', `(${excludeEntityTypes.join(',')})`);
    }

    if (startDate) {
      query = query.gte('performed_at', startDate);
    }

    if (endDate) {
      query = query.lte('performed_at', endDate);
    }

    // Execute query
    const { data: entries, error } = await query;

    if (error) throw error;

    if (!entries || entries.length === 0) return [];

    // Fetch user emails for all unique user_ids
    const userIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))];

    let userEmailMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      if (users) {
        users.forEach(u => {
          if (u.full_name) {
            userEmailMap.set(u.id, u.full_name);
          }
        });
      }
    }

    // Add user emails to entries
    const entriesWithEmails = entries.map(entry => ({
      ...entry,
      user_email: userEmailMap.get(entry.user_id) || 'Unknown User',
    }));

    // Apply search filter (client-side, as it searches across multiple fields)
    let filteredEntries = entriesWithEmails;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredEntries = entriesWithEmails.filter(entry => {
        return (
          entry.user_email?.toLowerCase().includes(searchLower) ||
          entry.entity_code?.toLowerCase().includes(searchLower) ||
          entry.action_type?.toLowerCase().includes(searchLower) ||
          entry.entity_type?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply userEmail filter (client-side, after email population)
    if (userEmail) {
      const emailLower = userEmail.toLowerCase();
      filteredEntries = filteredEntries.filter(entry =>
        entry.user_email?.toLowerCase().includes(emailLower)
      );
    }

    return filteredEntries;
  } catch (error) {
    console.error('Error loading audit trail:', error);
    return [];
  }
}

// =====================================================
// MANUAL AUDIT LOGGING
// =====================================================

/**
 * Log an audit trail entry manually (for actions not covered by triggers)
 *
 * Use this for:
 * - Approve/reject user
 * - Archive risk
 * - Bulk operations
 * - Configuration changes
 * - Any action that doesn't directly modify risks/controls/users
 *
 * @param actionType - Type of action (approve, reject, archive, bulk_delete, etc.)
 * @param entityType - Entity affected (user, risk, config, etc.)
 * @param entityCode - Code/identifier for entity
 * @param metadata - Additional context (reason, notes, count, etc.)
 */
export async function logAuditEntry(
  actionType: string,
  entityType: string,
  entityCode: string,
  metadata?: any
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    // Use the database function for consistency
    await supabase.rpc('log_audit_entry', {
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_code: entityCode,
      p_metadata: metadata || {},
    });

  } catch (error) {
    console.error('Error logging audit entry:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

// =====================================================
// EXPORT TO CSV
// =====================================================

/**
 * Export audit trail entries to CSV format
 *
 * @param entries - Audit trail entries to export
 * @returns CSV string
 */
export function exportAuditTrailToCSV(entries: AuditTrailEntry[]): string {
  if (entries.length === 0) {
    return 'No data to export';
  }

  // CSV headers
  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity Code',
    'User',
    'Details'
  ];

  // Build CSV rows
  const rows = entries.map(entry => {
    const timestamp = new Date(entry.performed_at).toLocaleString();
    const action = entry.action_type;
    const entityType = entry.entity_type;
    const entityCode = entry.entity_code || '-';
    const user = entry.user_email || 'Unknown';

    // Build details string (avoid commas in cells)
    let details = '';
    if (entry.metadata) {
      details = JSON.stringify(entry.metadata).replace(/,/g, ';');
    }

    return [
      timestamp,
      action,
      entityType,
      entityCode,
      user,
      details
    ].map(cell => `"${cell}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download audit trail as CSV file
 *
 * @param entries - Audit trail entries to export
 * @param filename - Optional filename (default: audit-trail-YYYY-MM-DD.csv)
 */
export function downloadAuditTrailCSV(
  entries: AuditTrailEntry[],
  filename?: string
): void {
  const csv = exportAuditTrailToCSV(entries);

  const defaultFilename = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
  const finalFilename = filename || defaultFilename;

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =====================================================
// HELPER: Format change details for display
// =====================================================

/**
 * Format old/new values for human-readable display
 * Used in detail dialogs to show what changed
 */
export function formatChangeDetails(entry: AuditTrailEntry): {
  before: Record<string, any>;
  after: Record<string, any>;
  hasChanges: boolean;
} {
  const before: Record<string, any> = {};
  const after: Record<string, any> = {};
  let hasChanges = false;

  if (entry.action_type === 'create' && entry.new_values) {
    // For creates, show new values only
    return {
      before: {},
      after: entry.new_values,
      hasChanges: true
    };
  }

  if (entry.action_type === 'delete' && entry.old_values) {
    // For deletes, show old values only
    return {
      before: entry.old_values,
      after: {},
      hasChanges: true
    };
  }

  if (entry.action_type === 'update' && entry.old_values && entry.new_values) {
    // For updates, show changed fields
    const oldVals = entry.old_values;
    const newVals = entry.new_values;

    Object.keys(newVals).forEach(key => {
      // Skip metadata fields
      if (['id', 'created_at', 'updated_at', 'organization_id', 'user_id'].includes(key)) {
        return;
      }

      // Check if value changed
      const oldVal = oldVals[key];
      const newVal = newVals[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        before[key] = oldVal;
        after[key] = newVal;
        hasChanges = true;
      }
    });
  }

  return { before, after, hasChanges };
}
