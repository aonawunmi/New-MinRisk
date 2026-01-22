/**
 * RAGStatusBadge Component
 * 
 * Displays computed RAG status with color coding and tooltip.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

import type { RAGStatus } from '@/types/tolerance';

interface RAGStatusBadgeProps {
    status: RAGStatus;
    metricName?: string;
    latestActual?: number;
    softLimit?: number;
    hardLimit?: number;
    unit?: string;
    showDetails?: boolean;
}

const STATUS_CONFIG: Record<
    RAGStatus,
    { label: string; className: string; icon: React.ReactNode }
> = {
    GREEN: {
        label: 'Green',
        className: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="h-3 w-3" />,
    },
    AMBER: {
        label: 'Amber',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: <AlertTriangle className="h-3 w-3" />,
    },
    RED: {
        label: 'Red',
        className: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="h-3 w-3" />,
    },
    NO_DATA: {
        label: 'No Data',
        className: 'bg-gray-100 text-gray-600 border-gray-300',
        icon: <HelpCircle className="h-3 w-3" />,
    },
    NO_KRI: {
        label: 'No KRI',
        className: 'bg-gray-100 text-gray-600 border-gray-300',
        icon: <HelpCircle className="h-3 w-3" />,
    },
    UNKNOWN: {
        label: 'Unknown',
        className: 'bg-gray-100 text-gray-600 border-gray-300',
        icon: <HelpCircle className="h-3 w-3" />,
    },
};

export function RAGStatusBadge({
    status,
    metricName,
    latestActual,
    softLimit,
    hardLimit,
    unit,
    showDetails = true,
}: RAGStatusBadgeProps) {
    const config = STATUS_CONFIG[status];

    const badge = (
        <Badge className={`${config.className} border flex items-center gap-1`}>
            {config.icon}
            {config.label}
        </Badge>
    );

    if (!showDetails || (!metricName && latestActual === undefined)) {
        return badge;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{badge}</TooltipTrigger>
                <TooltipContent className="max-w-xs">
                    <div className="space-y-1 text-xs">
                        {metricName && <p className="font-medium">{metricName}</p>}
                        {latestActual !== undefined && (
                            <p>
                                <strong>Current:</strong> {latestActual} {unit}
                            </p>
                        )}
                        {softLimit !== undefined && (
                            <p>
                                <strong>Soft Limit:</strong> {softLimit} {unit}
                            </p>
                        )}
                        {hardLimit !== undefined && (
                            <p>
                                <strong>Hard Limit:</strong> {hardLimit} {unit}
                            </p>
                        )}
                        {status === 'NO_DATA' && <p className="text-gray-500">No observations recorded</p>}
                        {status === 'NO_KRI' && (
                            <p className="text-gray-500">No primary KRI linked to this metric</p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
