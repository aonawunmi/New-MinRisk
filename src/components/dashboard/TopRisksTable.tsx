/**
 * TopRisksTable Component
 *
 * Displays a table of top risks by score
 */

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getRiskLevelColor } from '@/lib/analytics';
import type { TopRisk } from '@/lib/analytics';

interface TopRisksTableProps {
  risks: TopRisk[];
}

export default function TopRisksTable({ risks }: TopRisksTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Risk Code</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-center">Score</TableHead>
          <TableHead className="text-center">Level</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {risks.map((risk) => {
          const levelColor = getRiskLevelColor(
            risk.level as 'Low' | 'Medium' | 'High' | 'Extreme'
          );

          return (
            <TableRow key={risk.risk_code}>
              <TableCell className="font-mono text-sm">
                {risk.risk_code}
              </TableCell>
              <TableCell className="font-medium max-w-[300px] truncate">
                {risk.risk_title}
              </TableCell>
              <TableCell>{risk.division}</TableCell>
              <TableCell>{risk.category}</TableCell>
              <TableCell className="text-center font-semibold">
                {risk.inherent_score}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  style={{
                    backgroundColor: levelColor,
                    color: 'white',
                  }}
                >
                  {risk.level}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
