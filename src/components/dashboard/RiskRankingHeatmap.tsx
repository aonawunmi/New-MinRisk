
import React from 'react';
import { Card } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RiskProfileSummary } from '@/lib/analytics';

interface RiskRankingHeatmapProps {
    data: RiskProfileSummary[];
    onCategoryClick?: (category: string) => void;
}

export default function RiskRankingHeatmap({ data, onCategoryClick }: RiskRankingHeatmapProps) {
    // Config
    const matrixSize = 5;
    const axisLabels = ['1', '2', '3', '4', '5'];

    // Define zones for background coloring (simplified approach)
    // Green: Low, Yellow: Med, Orange: High, Red: Critical
    // We will build a 5x5 grid CSS grid to strictly control the background
    const getCellColor = (x: number, y: number) => {
        // x = occurrence (1-5), y = severity (1-5)
        const score = x * y;
        if (score <= 5) return '#22c55e'; // Green
        if (score <= 12) return '#eab308'; // Yellow
        if (score <= 19) return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    return (
        <Card className="p-3 sm:p-6 bg-white overflow-hidden">
            <h3 className="text-center font-bold text-base sm:text-lg mb-4 sm:mb-6 uppercase">Risk Ranking</h3>

            <div className="relative w-full aspect-[1.2] max-w-2xl mx-auto min-w-[280px]">
                {/* Y-Axis Label - hidden on mobile to save space */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 font-bold text-xs sm:text-sm text-gray-700 hidden sm:block">
                    Severity of Impact
                </div>

                {/* X-Axis Label */}
                <div className="absolute bottom-[-30px] sm:bottom-[-40px] left-1/2 -translate-x-1/2 font-bold text-xs sm:text-sm text-gray-700">
                    Occurrence
                </div>

                {/* The Grid Container */}
                <div
                    className="grid grid-cols-5 grid-rows-5 gap-[1px] bg-white border-2 border-gray-800 w-full h-full"
                    style={{
                        // Invert Y axis visually so 5 is top, 1 is bottom
                        // Actually, CSS grid row 1 is top. So row 1 = Impact 5.
                    }}
                >
                    {/* Generate Grid Cells */}
                    {Array.from({ length: 5 }).map((_, rowIndex) => {
                        const impact = 5 - rowIndex; // 5, 4, 3, 2, 1
                        return Array.from({ length: 5 }).map((_, colIndex) => {
                            const likelihood = colIndex + 1; // 1, 2, 3, 4, 5
                            return (
                                <div
                                    key={`${likelihood}-${impact}`}
                                    className="relative w-full h-full"
                                    style={{ backgroundColor: getCellColor(likelihood, impact) }}
                                >
                                    {/* Axis Numbers inside grid edges logic is tricky, usually outside. 
                         Let's put simple text guides if needed, or rely on outer axis. */}
                                </div>
                            );
                        });
                    })}
                </div>

                {/* Overlay Bubbles */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <TooltipProvider>
                        {data.map((item, i) => {
                            // Calculate position percentages
                            // Likelihood (X): 1..5.  (val - 1) / 4 * 100? No, (val - 0.5) / 5 * 100 to center in cell?
                            // Let's assume standard plotting:
                            // X Axis 0-5. Value 1 is at 20% mark? Or 1..5 as discrete blocks.
                            // If Grid is 5 columns. Center of column 1 is 10%. Center of Col 5 is 90%.
                            // Formula: ((Value - 1) * 20) + 10 %

                            const leftPct = ((item.avg_likelihood - 1) / (5 - 1)) * 100; // This maps 1->0%, 5->100%. 
                            // Wait, purely bubble chart often treats 1,2,3... as ticks. 
                            // Let's stick to centering in the discrete block for now:
                            // value 1 -> Column 1. 
                            // If avg is 1.5, it should be between Col 1 and 2.
                            // Width is 100%. One unit is 20%.
                            // Position = (Value - 0.5) * 20% ? 
                            // Test: Val=1 => (0.5)*20 = 10% (Center of first column). Correct.
                            // Test: Val=5 => (4.5)*20 = 90% (Center of last column). Correct.
                            const x = (item.avg_likelihood - 0.5) * 20;

                            // Y Axis same logic but inverted. 
                            // Top is 0%. Bottom is 100%.
                            // Impact 5 is at Top (10%). Impact 1 is at Bottom (90%).
                            // Invert value first? 
                            // Let standard coords be 0 bottom, 100 top.
                            // y_std = (Value - 0.5) * 20.
                            // css_top = 100 - y_std.
                            const y_std = (item.avg_impact - 0.5) * 20;
                            const topPct = 100 - y_std;

                            return (
                                <div
                                    key={item.category}
                                    className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                                    style={{
                                        left: `${x}%`,
                                        top: `${topPct}%`,
                                    }}
                                >
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div
                                                onClick={() => onCategoryClick && onCategoryClick(item.category)}
                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-[10px] sm:text-xs cursor-pointer hover:scale-110 transition-transform z-10 hover:bg-orange-500 active:scale-95 touch-target"
                                                style={{
                                                    // Distinct colors per category? Or uniform? Screen shows orange.
                                                }}
                                            >
                                                {item.risk_count}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            <div className="text-center font-semibold">
                                                <p>{item.category}</p>
                                                <p className="text-xs font-normal opacity-90">
                                                    P: {item.avg_likelihood} | I: {item.avg_impact}
                                                </p>
                                                <p className="text-[10px] text-orange-200 mt-1">Click to view risks</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>

                                    {/* Label below bubble? Or just rely on Legend/Tooltip? 
                       Screenshot shows numbers inside bubbles, legend separate.
                       We did number inside.
                   */}
                                </div>
                            );
                        })}
                    </TooltipProvider>
                </div>

                {/* Outer Axis Labels */}
                <div className="absolute -left-6 top-0 h-full flex flex-col justify-between py-[10%] text-sm font-semibold">
                    <span>5</span>
                    <span>4</span>
                    <span>3</span>
                    <span>2</span>
                    <span>1</span>
                </div>
                <div className="absolute -bottom-6 left-0 w-full flex justify-between px-[10%] text-sm font-semibold">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                </div>
            </div>
        </Card>
    );
}
