/**
 * Incident Submission Form Component
 * Allows users to report new incidents or edit existing ones
 */

import React, { useState, useEffect } from 'react';
import { createIncident, updateIncident, getIncidentById } from '../../lib/incidents';
import type { CreateIncidentInput, IncidentSeverity } from '../../types/incident';
import { SEVERITY_OPTIONS } from '../../types/incident';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface IncidentFormProps {
  incidentId?: string; // If provided, form is in edit mode
  onSuccess?: (incidentId: string) => void;
  onCancel?: () => void;
}

export function IncidentForm({ incidentId, onSuccess, onCancel }: IncidentFormProps) {
  const isEditMode = !!incidentId;
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    incident_type: '',
    severity: 'MEDIUM',
    occurred_at: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
    visibility_scope: 'REPORTER_ONLY',
    linked_risk_codes: [],
    financial_impact: '',
  });

  // Load existing incident data if in edit mode
  useEffect(() => {
    if (incidentId) {
      loadIncidentData();
    }
  }, [incidentId]);

  const loadIncidentData = async () => {
    if (!incidentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getIncidentById(incidentId);

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Incident not found');

      // Convert database format to form format
      const severityMap: { [key: number]: IncidentSeverity } = {
        1: 'LOW',
        2: 'MEDIUM',
        3: 'HIGH',
        4: 'CRITICAL'
      };

      setFormData({
        title: data.title || '',
        description: data.description || '',
        incident_type: data.incident_type || '',
        severity: typeof data.severity === 'number' ? severityMap[data.severity] : data.severity,
        occurred_at: data.incident_date
          ? new Date(data.incident_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        visibility_scope: data.visibility_scope || 'REPORTER_ONLY',
        linked_risk_codes: data.linked_risk_codes || [],
        financial_impact: data.financial_impact || '',
      });
    } catch (err) {
      console.error('Error loading incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to load incident');
    } finally {
      setIsLoading(false);
    }
  };

  // Common incident types
  const incidentTypes = [
    'Data Breach',
    'System Outage',
    'Security Incident',
    'Operational Error',
    'Compliance Violation',
    'Fraud',
    'Customer Complaint',
    'Process Failure',
    'Third-Party Incident',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.title.trim()) {
      setError('Please enter an incident title');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please enter an incident description');
      return;
    }
    if (!formData.incident_type) {
      setError('Please select an incident type');
      return;
    }
    if (!formData.occurred_at) {
      setError('Please enter when the incident occurred');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && incidentId) {
        // Update existing incident
        const { data, error: updateError } = await updateIncident(incidentId, {
          title: formData.title,
          description: formData.description,
          incident_type: formData.incident_type,
          severity: formData.severity,
          occurred_at: formData.occurred_at,
          financial_impact: formData.financial_impact ? parseFloat(formData.financial_impact) : null,
        });

        if (updateError) {
          throw updateError;
        }

        setSuccess(true);

        // Call success callback
        if (onSuccess && data) {
          setTimeout(() => onSuccess(data.id), 1500);
        }
      } else {
        // Create new incident
        const { data, error: createError } = await createIncident(formData);

        if (createError) {
          throw createError;
        }

        setSuccess(true);

        // Reset form
        setFormData({
          title: '',
          description: '',
          incident_type: '',
          severity: 'MEDIUM',
          occurred_at: new Date().toISOString().slice(0, 16),
          visibility_scope: 'REPORTER_ONLY',
          linked_risk_codes: [],
          financial_impact: '',
        });

        // Call success callback
        if (onSuccess && data) {
          setTimeout(() => onSuccess(data.id), 1500);
        }
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} incident:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} incident`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateIncidentInput,
    value: string | IncidentSeverity
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Loading state for edit mode
  if (isLoading) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Loading incident details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Incident' : 'Report New Incident'}</CardTitle>
        <CardDescription>
          {isEditMode
            ? 'Update the incident details below. All fields marked with * are required.'
            : 'Please provide details about the incident. All fields marked with * are required.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {isEditMode ? 'Incident updated successfully! Redirecting...' : 'Incident reported successfully! Redirecting...'}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Incident Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Incident Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief summary of the incident"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Incident Type */}
          <div className="space-y-2">
            <Label htmlFor="incident_type">
              Incident Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.incident_type}
              onValueChange={(value) => handleInputChange('incident_type', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="incident_type">
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {incidentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="severity">
              Severity <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.severity}
              onValueChange={(value) => handleInputChange('severity', value as IncidentSeverity)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {formData.severity === 'LOW' && 'Minor issue with minimal impact'}
              {formData.severity === 'MEDIUM' && 'Moderate issue requiring attention'}
              {formData.severity === 'HIGH' && 'Significant issue with major impact'}
              {formData.severity === 'CRITICAL' && 'Severe issue requiring immediate action'}
            </p>
          </div>

          {/* Occurred At */}
          <div className="space-y-2">
            <Label htmlFor="occurred_at">
              When Did This Occur? <span className="text-red-500">*</span>
            </Label>
            <Input
              id="occurred_at"
              type="datetime-local"
              value={formData.occurred_at}
              onChange={(e) => handleInputChange('occurred_at', e.target.value)}
              disabled={isSubmitting}
              required
              max={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-sm text-gray-500">
              Enter the date and time when the incident occurred
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Incident Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide detailed information about what happened, including:
- What was observed
- When it was discovered
- Who was affected
- Any immediate actions taken"
              rows={8}
              disabled={isSubmitting}
              required
            />

            {/* Description quality indicator */}
            {formData.description.length > 0 && (
              <div className="mt-2">
                {(() => {
                  const length = formData.description.length;
                  const wordCount = formData.description.split(/\s+/).filter(w => w.length > 0).length;

                  if (length < 50) {
                    return (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-sm text-red-800">
                          <strong>⚠️ Too brief ({length} characters).</strong> Add more details about what happened, the impact, and root cause for better AI risk mapping.
                        </AlertDescription>
                      </Alert>
                    );
                  } else if (length < 100) {
                    return (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertDescription className="text-sm text-orange-800">
                          <strong>📝 Brief description ({length} characters).</strong> Consider adding more context about impact and cause for accurate AI analysis.
                        </AlertDescription>
                      </Alert>
                    );
                  } else if (length < 200) {
                    return (
                      <Alert className="border-blue-200 bg-blue-50">
                        <AlertDescription className="text-sm text-blue-800">
                          <strong>✓ Good length ({length} characters, {wordCount} words).</strong> Make sure to include specific details about impact and root cause.
                        </AlertDescription>
                      </Alert>
                    );
                  } else {
                    return (
                      <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-sm text-green-800">
                          <strong>✓ Excellent detail ({length} characters, {wordCount} words).</strong> This will help AI provide accurate risk mapping suggestions.
                        </AlertDescription>
                      </Alert>
                    );
                  }
                })()}
              </div>
            )}

            <p className="text-sm text-gray-500">
              <strong>Tip:</strong> Include specific details about what happened, root cause, impact (systems/users affected), and any technical details (CVE numbers, error codes).
              Aim for at least 100 characters for accurate AI risk analysis.
            </p>
          </div>

          {/* Financial Impact */}
          <div className="space-y-2">
            <Label htmlFor="financial_impact">
              Financial Impact (Optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
              <Input
                id="financial_impact"
                type="number"
                min="0"
                step="0.01"
                value={formData.financial_impact}
                onChange={(e) => setFormData(prev => ({ ...prev, financial_impact: e.target.value }))}
                placeholder="0.00"
                className="pl-7"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-sm text-gray-500">
              Estimated or actual financial loss from this incident in Nigerian Naira (if applicable)
            </p>
          </div>

          {/* Visibility Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              <strong>Privacy:</strong> Only you and administrators will be able to view this
              incident report.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (isEditMode ? 'Updating...' : 'Submitting...')
                : (isEditMode ? 'Update Incident' : 'Submit Incident Report')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
