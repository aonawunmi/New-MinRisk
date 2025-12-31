
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRiskLevelColor } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import type { Risk } from '@/types/risk';

interface RiskCategoryDrilldownProps {
    category: string;
    onClose: () => void;
}

export default function RiskCategoryDrilldown({ category, onClose }: RiskCategoryDrilldownProps) {
    const [risks, setRisks] = useState<Risk[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRisks() {
            setLoading(true);
            try {
                let query = supabase
                    .from('risks')
                    .select('*')
                    .eq('status', 'OPEN'); // Filter by Open status by default

                if (category === 'Uncategorized') {
                    // If category is "Uncategorized", match null or explicit "Uncategorized"
                    query = query.or('category.is.null,category.eq.Uncategorized');
                } else {
                    query = query.eq('category', category);
                }

                const { data, error } = await query.order('residual_score', { ascending: false, nullsFirst: false });

                if (error) {
                    console.error('Error fetching risks for category:', error);
                    console.log('Query params - category:', category, 'status: OPEN');
                } else {
                    console.log('Drilldown results for category', category, ':', data?.length, 'risks found');
                    if (data?.length === 0) {
                        // Debug: fetch without status filter to see what exists
                        const { data: allRisks } = await supabase
                            .from('risks')
                            .select('category, status')
                            .eq('category', category);
                        console.log('All risks with this category (no status filter):', allRisks);
                    }
                    setRisks(data || []);
                }
            } catch (err) {
                console.error('Unexpected error:', err);
            } finally {
                setLoading(false);
            }
        }

        if (category) {
            fetchRisks();
        }
    }, [category]);

    // Helper to calculate risk score if not strictly in DB or for display
    const getRiskScore = (risk: Risk) => {
        // Prefer residual, fallback to inherent
        if (risk.residual_score) return risk.residual_score;
        // Calculate fallback
        const l = risk.residual_likelihood || risk.likelihood_inherent;
        const i = risk.residual_impact || risk.impact_inherent;
        return l * i;
    };

    return (
        <Card className="mt-6 border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold text-slate-800">
                    Risk Composition: <span className="text-blue-600">{category}</span>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : risks.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        No open risks found for this category.
                    </div>
                ) : (
                    <div className="relative overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead className="w-[40%]">Risk Title</TableHead>
                                    <TableHead className="text-center">Inherent</TableHead>
                                    <TableHead className="text-center">Residual</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {risks.map((risk) => {
                                    const inherentScore = risk.likelihood_inherent * risk.impact_inherent;
                                    const residualScore = getRiskScore(risk);

                                    return (
                                        <TableRow key={risk.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{risk.risk_code}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-700">{risk.risk_title}</div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    style={{
                                                        backgroundColor: getRiskLevelColor(inherentScore > 15 ? 'Extreme' : inherentScore > 8 ? 'High' : inherentScore > 3 ? 'Medium' : 'Low'),
                                                        color: '#fff',
                                                        borderColor: 'transparent'
                                                    }}
                                                >
                                                    {inherentScore}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    style={{
                                                        backgroundColor: getRiskLevelColor(residualScore > 15 ? 'Extreme' : residualScore > 8 ? 'High' : residualScore > 3 ? 'Medium' : 'Low'),
                                                        color: '#fff',
                                                        borderColor: 'transparent'
                                                    }}
                                                >
                                                    {residualScore}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="text-xs">{risk.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
