/**
 * Outcomes Architecture Test Page
 * 
 * Demo page to test all new Phase 1-3 components
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OutcomesManager } from '@/components/outcomes/OutcomesManager';
import { KRIObservationEntry } from '@/components/kri/KRIObservationEntry';
import { ToleranceMetricForm } from '@/components/tolerance/ToleranceMetricForm';
import { RAGStatusBadge } from '@/components/rag/RAGStatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function OutcomesArchitectureTest() {
    // Sample data for demo purposes
    const sampleRiskId = '11111111-1111-1111-1111-111111111111'; // Replace with actual risk ID
    const sampleKRIId = '22222222-2222-2222-2222-222222222222'; // Replace with actual KRI ID

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Outcomes Architecture Test Page</h1>
                <p className="text-gray-600">
                    Test all Phase 1-3 components with live database
                </p>
            </div>

            <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                    <strong>Instructions:</strong> Test each component tab to verify database integration.
                    You may need to update the sample IDs in the code to match your actual data.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="outcomes" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
                    <TabsTrigger value="observations">KRI Observations</TabsTrigger>
                    <TabsTrigger value="tolerance">Tolerance Metrics</TabsTrigger>
                    <TabsTrigger value="rag">RAG Status</TabsTrigger>
                </TabsList>

                {/* Tab 1: Outcomes Manager */}
                <TabsContent value="outcomes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test: Outcomes Manager</CardTitle>
                            <CardDescription>
                                Multi-select harm types for risks with quantifiability assessment
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OutcomesManager
                                riskId={sampleRiskId}
                                riskTitle="Sample Risk for Testing"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: KRI Observation Entry */}
                <TabsContent value="observations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test: KRI Observation Entry</CardTitle>
                            <CardDescription>
                                Record observations with maker-checker workflow
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <KRIObservationEntry
                                kriId={sampleKRIId}
                                kriCode="TEST-001"
                                kriName="Sample KRI for Testing"
                                unit="USD"
                                target={100}
                                directionOfGoodness="lower_is_better"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Tolerance Metric Form */}
                <TabsContent value="tolerance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test: Tolerance Metric Form</CardTitle>
                            <CardDescription>
                                Create tolerance metrics with soft/hard limits
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ToleranceMetricForm
                                riskId={sampleRiskId}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 4: RAG Status Examples */}
                <TabsContent value="rag">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test: RAG Status Badge</CardTitle>
                            <CardDescription>
                                Color-coded RAG status display examples
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium mb-2">Sample RAG Statuses:</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <RAGStatusBadge
                                            status="GREEN"
                                            metricName="Operational Loss"
                                            latestActual={45}
                                            softLimit={50}
                                            hardLimit={100}
                                            unit="USD"
                                        />
                                        <RAGStatusBadge
                                            status="AMBER"
                                            metricName="Customer Complaints"
                                            latestActual={75}
                                            softLimit={50}
                                            hardLimit={100}
                                            unit="count"
                                        />
                                        <RAGStatusBadge
                                            status="RED"
                                            metricName="System Downtime"
                                            latestActual={120}
                                            softLimit={50}
                                            hardLimit={100}
                                            unit="hours"
                                        />
                                        <RAGStatusBadge status="NO_DATA" />
                                        <RAGStatusBadge status="NO_KRI" />
                                        <RAGStatusBadge status="UNKNOWN" />
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-gray-50 rounded">
                                    <h4 className="font-medium mb-2">How to Test with Real Data:</h4>
                                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                                        <li>Create outcomes for a risk in the Outcomes tab</li>
                                        <li>Record observations for a KRI in the Observations tab</li>
                                        <li>Create a tolerance metric linked to an outcome</li>
                                        <li>Link the tolerance to a KRI via tolerance_kri_coverage table</li>
                                        <li>RAG status will compute automatically based on observations</li>
                                    </ol>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-medium mb-2">Next Steps:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Update sample IDs to match your actual risk/KRI data</li>
                    <li>Test each component tab</li>
                    <li>Verify data saves to database correctly</li>
                    <li>Check console for any errors</li>
                    <li>Once verified, integrate components into main app flows</li>
                </ul>
            </div>
        </div>
    );
}
