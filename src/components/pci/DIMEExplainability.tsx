/**
 * DIMEExplainability Component
 *
 * Shows detailed calculation trace for DIME scores.
 * Displays weights, contributions, and cap triggers.
 */

import type { DerivedDIMEScore, SCDimension } from '@/types/pci';
import { DIMENSION_LABELS, CRITICALITY_LABELS } from '@/types/pci';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Check, X, Minus, Calculator } from 'lucide-react';

interface DIMEExplainabilityProps {
  dimeScore: DerivedDIMEScore;
}

export default function DIMEExplainability({
  dimeScore,
}: DIMEExplainabilityProps) {
  const { calc_trace, cap_details } = dimeScore;

  if (!calc_trace) {
    return (
      <div className="text-muted-foreground text-sm">
        Calculation trace not available.
      </div>
    );
  }

  const dimensions: SCDimension[] = ['D', 'I', 'M', 'E'];

  function getStatusIcon(status: string) {
    switch (status) {
      case 'yes':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <Minus className="h-4 w-4 text-amber-600" />;
      case 'no':
        return <X className="h-4 w-4 text-red-600" />;
      case 'na':
      case 'not_attested':
        return <Minus className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  }

  function getCriticalityColor(criticality: string) {
    switch (criticality) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'important':
        return 'bg-amber-100 text-amber-800';
      case 'optional':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Group secondary controls by dimension
  const controlsByDimension = calc_trace.secondary_controls.reduce(
    (acc, control) => {
      const dim = control.dimension as SCDimension;
      if (!acc[dim]) acc[dim] = [];
      acc[dim].push(control);
      return acc;
    },
    {} as Record<SCDimension, typeof calc_trace.secondary_controls>
  );

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Score Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            {dimensions.map((dim) => {
              const totals = calc_trace.dimension_totals[dim];
              const finalScore =
                dim === 'E' ? dimeScore.e_final : dimeScore[`${dim.toLowerCase()}_score` as keyof DerivedDIMEScore] as number;
              const isCapped = cap_details?.[`${dim.toLowerCase()}_capped` as keyof typeof cap_details];

              return (
                <div key={dim} className="space-y-1">
                  <div className="text-sm font-medium text-muted-foreground">
                    {DIMENSION_LABELS[dim]}
                  </div>
                  <div className="text-2xl font-bold">
                    {finalScore.toFixed(2)}
                  </div>
                  {isCapped && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Capped
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {totals.weighted_sum.toFixed(1)} / {totals.weight_total.toFixed(1)} weighted
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cap Triggers */}
      {cap_details && cap_details.caps_triggered.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Hard Caps Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 mb-3">
              The following dimensions were capped to ≤1.0 because a critical
              secondary control was marked "No":
            </p>
            <div className="flex flex-wrap gap-2">
              {cap_details.caps_triggered.map((trigger, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-white text-amber-800 border-amber-300"
                >
                  {DIMENSION_LABELS[trigger.dimension as SCDimension]} capped by{' '}
                  {trigger.code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Constrained Effectiveness */}
      {calc_trace.constrained_effectiveness.constrained_by !== 'none' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-800">
              Constrained Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800">
              Effectiveness (E) was constrained from{' '}
              <strong>{calc_trace.constrained_effectiveness.e_raw.toFixed(2)}</strong> to{' '}
              <strong>{calc_trace.constrained_effectiveness.e_final.toFixed(2)}</strong>
              {' '}because E cannot exceed the minimum of D, I, or M
              (constrained by{' '}
              <strong>
                {DIMENSION_LABELS[calc_trace.constrained_effectiveness.constrained_by as SCDimension] ||
                  calc_trace.constrained_effectiveness.constrained_by}
              </strong>
              ).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail Tables by Dimension */}
      {dimensions.map((dim) => {
        const controls = controlsByDimension[dim] || [];
        const totals = calc_trace.dimension_totals[dim];

        return (
          <Card key={dim}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {DIMENSION_LABELS[dim]} ({controls.length} controls)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Code</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-20 text-right">Weight</TableHead>
                    <TableHead className="w-20 text-right">Value</TableHead>
                    <TableHead className="w-24 text-right">Contribution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controls.map((control, idx) => (
                    <TableRow
                      key={idx}
                      className={!control.included ? 'text-muted-foreground bg-gray-50' : ''}
                    >
                      <TableCell className="font-mono text-sm">
                        {control.code}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getCriticalityColor(control.criticality)}
                        >
                          {CRITICALITY_LABELS[control.criticality as keyof typeof CRITICALITY_LABELS] ||
                            control.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(control.status)}
                          <span className="capitalize text-sm">
                            {control.status === 'na'
                              ? 'N/A'
                              : control.status === 'not_attested'
                              ? 'Not attested'
                              : control.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {control.included ? control.weight?.toFixed(0) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {control.included ? control.status_value?.toFixed(1) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {control.included ? control.contribution?.toFixed(2) : '-'}
                        {!control.included && (
                          <span className="text-xs ml-1">({control.reason})</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Dimension Total Row */}
                  <TableRow className="bg-gray-100 font-medium">
                    <TableCell colSpan={3}>Dimension Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {totals.weight_total.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right font-mono">
                      {totals.weighted_sum.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Formula */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm font-mono">
                Score = 3 × ({totals.weighted_sum.toFixed(2)} /{' '}
                {totals.weight_total.toFixed(0)}) ={' '}
                <strong>{totals.raw.toFixed(2)}</strong>
                {cap_details?.[`${dim.toLowerCase()}_capped` as keyof typeof cap_details] && (
                  <span className="text-amber-600 ml-2">
                    → capped to 1.00
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Weights Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weight Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-100 text-red-800">
                Critical
              </Badge>
              <span>Weight = 3</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                Important
              </Badge>
              <span>Weight = 2</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                Optional
              </Badge>
              <span>Weight = 1</span>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <strong>Status values:</strong> Yes = 1.0, Partial = 0.5, No = 0.0, N/A = excluded
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
