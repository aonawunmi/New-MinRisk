/**
 * Global Risk Appetite Level Definitions
 * 
 * These are enterprise-wide, immutable anchor definitions that apply
 * uniformly across all risk categories. AI-generated category statements
 * must apply these meanings - never redefine them.
 */

export type AppetiteLevel = 'ZERO' | 'LOW' | 'MODERATE' | 'HIGH';

export interface AppetiteLevelDefinition {
    level: AppetiteLevel;
    label: string;
    enterpriseMeaning: string;
    colorClass: string;
    badgeVariant: 'destructive' | 'secondary' | 'outline' | 'default';
}

/**
 * Canonical Enterprise Appetite Level Definitions
 * 
 * These definitions are the "anchor" meanings - they do not change
 * based on risk category. When AI generates a statement for a specific
 * category, it applies this meaning to that category context.
 */
export const APPETITE_LEVEL_DEFINITIONS: Record<AppetiteLevel, AppetiteLevelDefinition> = {
    ZERO: {
        level: 'ZERO',
        label: 'Zero (No Tolerance)',
        enterpriseMeaning: 'Risks that threaten regulatory licence, solvency, or fundamental trust are not acceptable under any circumstances',
        colorClass: 'bg-red-100 text-red-800 border-red-300',
        badgeVariant: 'destructive',
    },
    LOW: {
        level: 'LOW',
        label: 'Low',
        enterpriseMeaning: 'Only limited, short-duration exposure is acceptable; breaches require immediate escalation and remediation',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
        badgeVariant: 'secondary',
    },
    MODERATE: {
        level: 'MODERATE',
        label: 'Moderate',
        enterpriseMeaning: 'Managed volatility is acceptable within approved limits and controls',
        colorClass: 'bg-blue-100 text-blue-800 border-blue-300',
        badgeVariant: 'outline',
    },
    HIGH: {
        level: 'HIGH',
        label: 'High',
        enterpriseMeaning: 'Willingness to accept material volatility in pursuit of strategic objectives',
        colorClass: 'bg-green-100 text-green-800 border-green-300',
        badgeVariant: 'default',
    },
};

/**
 * Get all appetite levels as an ordered array (None → Low → Moderate → High)
 */
export function getAppetiteLevels(): AppetiteLevelDefinition[] {
    return [
        APPETITE_LEVEL_DEFINITIONS.ZERO,
        APPETITE_LEVEL_DEFINITIONS.LOW,
        APPETITE_LEVEL_DEFINITIONS.MODERATE,
        APPETITE_LEVEL_DEFINITIONS.HIGH,
    ];
}

/**
 * Get the enterprise meaning for a given appetite level
 */
export function getAppetiteMeaning(level: AppetiteLevel): string {
    return APPETITE_LEVEL_DEFINITIONS[level]?.enterpriseMeaning || '';
}
