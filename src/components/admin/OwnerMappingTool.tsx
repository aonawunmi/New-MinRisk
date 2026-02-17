/**
 * OwnerMappingTool Component
 *
 * Admin tool for mapping legacy text owner names to actual user accounts.
 * This helps migrate from the old TEXT owner field to the new owner_id FK.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedProfile } from '@/lib/auth';
import { listUsersInOrganization } from '@/lib/admin';
import { updateRisk } from '@/lib/risks';
import type { Risk } from '@/types/risk';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, User, Users } from 'lucide-react';

interface LegacyOwnerGroup {
  ownerText: string;
  riskCount: number;
  sampleRisks: Risk[];
  mappedUserId?: string | null;
}

interface OrgUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export default function OwnerMappingTool() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [legacyOwners, setLegacyOwners] = useState<LegacyOwnerGroup[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [mappings, setMappings] = useState<Map<string, string>>(new Map());
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Get current user's organization
      const authProfile = await getAuthenticatedProfile();
      if (!authProfile) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      if (!authProfile.organization_id) {
        setError('User profile not found');
        setLoading(false);
        return;
      }

      // Load all users in organization
      const { data: users, error: usersError } = await listUsersInOrganization(authProfile.organization_id);

      if (usersError) {
        setError('Failed to load users: ' + usersError.message);
        setLoading(false);
        return;
      }

      setOrgUsers(users || []);

      // Load all risks with legacy owners (owner_id is null)
      const { data: risks, error: risksError } = await supabase
        .from('risks')
        .select('*')
        .eq('organization_id', authProfile.organization_id)
        .is('owner_id', null);

      if (risksError) {
        setError('Failed to load risks: ' + risksError.message);
        setLoading(false);
        return;
      }

      // Group risks by legacy owner text
      const ownerGroups = new Map<string, Risk[]>();

      (risks || []).forEach(risk => {
        const ownerText = risk.owner || '(No owner)';
        if (!ownerGroups.has(ownerText)) {
          ownerGroups.set(ownerText, []);
        }
        ownerGroups.get(ownerText)!.push(risk);
      });

      // Convert to array of LegacyOwnerGroup
      const groups: LegacyOwnerGroup[] = Array.from(ownerGroups.entries()).map(([ownerText, risks]) => ({
        ownerText,
        riskCount: risks.length,
        sampleRisks: risks.slice(0, 3), // Show first 3 risks as samples
        mappedUserId: null,
      }));

      // Sort by risk count (descending)
      groups.sort((a, b) => b.riskCount - a.riskCount);

      setLegacyOwners(groups);
      setLoading(false);
    } catch (err) {
      console.error('Unexpected error loading data:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  }

  function handleMappingChange(ownerText: string, userId: string) {
    setMappings(prev => {
      const newMap = new Map(prev);
      newMap.set(ownerText, userId);
      return newMap;
    });
  }

  async function applyMapping(ownerText: string) {
    const userId = mappings.get(ownerText);
    if (!userId) {
      alert('Please select a user first');
      return;
    }

    setApplying(ownerText);
    setError(null);
    setSuccess(null);

    try {
      // Get the selected user's name
      const selectedUser = orgUsers.find(u => u.id === userId);
      if (!selectedUser) {
        alert('Selected user not found');
        setApplying(null);
        return;
      }

      // Find all risks with this legacy owner
      const group = legacyOwners.find(g => g.ownerText === ownerText);
      if (!group) {
        setApplying(null);
        return;
      }

      // Update all risks with this owner text
      const authProfile = await getAuthenticatedProfile();
      if (!authProfile) {
        setError('User not authenticated');
        setApplying(null);
        return;
      }

      if (!authProfile.organization_id) {
        setError('User profile not found');
        setApplying(null);
        return;
      }

      // Update all risks
      const { error: updateError } = await supabase
        .from('risks')
        .update({
          owner_id: userId,
          owner: selectedUser.full_name, // Update the display name too
        })
        .eq('organization_id', authProfile.organization_id)
        .eq('owner', ownerText)
        .is('owner_id', null);

      if (updateError) {
        setError('Failed to apply mapping: ' + updateError.message);
        setApplying(null);
        return;
      }

      setSuccess(`Successfully mapped "${ownerText}" to ${selectedUser.full_name} (${group.riskCount} risks updated)`);

      // Remove this group from the list
      setLegacyOwners(prev => prev.filter(g => g.ownerText !== ownerText));
      setMappings(prev => {
        const newMap = new Map(prev);
        newMap.delete(ownerText);
        return newMap;
      });

      setApplying(null);
    } catch (err) {
      console.error('Unexpected error applying mapping:', err);
      setError('An unexpected error occurred');
      setApplying(null);
    }
  }

  async function applyAllMappings() {
    if (mappings.size === 0) {
      alert('No mappings configured');
      return;
    }

    if (!confirm(`Apply ${mappings.size} mapping(s)? This will update all associated risks.`)) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    let successCount = 0;
    let failCount = 0;

    for (const [ownerText, userId] of mappings.entries()) {
      try {
        const selectedUser = orgUsers.find(u => u.id === userId);
        if (!selectedUser) continue;

        const authProfile = await getAuthenticatedProfile();
        if (!authProfile) continue;

        if (!authProfile.organization_id) continue;

        const { error: updateError } = await supabase
          .from('risks')
          .update({
            owner_id: userId,
            owner: selectedUser.full_name,
          })
          .eq('organization_id', authProfile.organization_id)
          .eq('owner', ownerText)
          .is('owner_id', null);

        if (updateError) {
          console.error('Failed to map:', ownerText, updateError);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Error mapping:', ownerText, err);
        failCount++;
      }
    }

    setSaving(false);

    if (failCount > 0) {
      setError(`Applied ${successCount} mapping(s). Failed to apply ${failCount} mapping(s).`);
    } else {
      setSuccess(`Successfully applied all ${successCount} mapping(s)!`);
    }

    // Reload data
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Loading legacy owners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Owner Mapping Tool
              </CardTitle>
              <CardDescription>
                Map legacy text owner names to actual user accounts
              </CardDescription>
            </div>
            {mappings.size > 0 && (
              <Button
                onClick={applyAllMappings}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>Apply All Mappings ({mappings.size})</>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {legacyOwners.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All owners mapped!
              </h3>
              <p className="text-gray-600">
                All risks have been assigned to user accounts.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {legacyOwners.length} legacy owner(s) affecting {legacyOwners.reduce((sum, g) => sum + g.riskCount, 0)} risk(s).
                  Map each to a user account to enable proper ownership tracking.
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Legacy Owner (Text)</TableHead>
                      <TableHead className="text-center">Risk Count</TableHead>
                      <TableHead>Sample Risks</TableHead>
                      <TableHead>Map to User</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legacyOwners.map((group) => (
                      <TableRow key={group.ownerText}>
                        <TableCell className="font-medium">
                          {group.ownerText}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{group.riskCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600 space-y-1">
                            {group.sampleRisks.map(risk => (
                              <div key={risk.id}>
                                {risk.risk_code} - {risk.risk_title.substring(0, 40)}
                                {risk.risk_title.length > 40 && '...'}
                              </div>
                            ))}
                            {group.riskCount > 3 && (
                              <div className="text-gray-400 italic">
                                +{group.riskCount - 3} more...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mappings.get(group.ownerText) || ''}
                            onValueChange={(userId) => handleMappingChange(group.ownerText, userId)}
                            disabled={applying === group.ownerText}
                          >
                            <SelectTrigger className="w-[250px]">
                              <SelectValue placeholder="Select user..." />
                            </SelectTrigger>
                            <SelectContent>
                              {orgUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3" />
                                    {user.full_name} ({user.email})
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => applyMapping(group.ownerText)}
                            disabled={!mappings.has(group.ownerText) || applying === group.ownerText}
                          >
                            {applying === group.ownerText ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>Apply</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
