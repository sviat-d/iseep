"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
/** Minimum closed deals before win rate is considered reliable */
const MIN_DEALS_FOR_CONFIDENCE = 5;

const TYPE_LABELS: Record<string, string> = {
  feature_request: "Feature Request",
  adjacent_product: "Adjacent Product",
  use_case: "Use Case",
  integration_request: "Integration",
};

type WinLossIcp = {
  icpId: string;
  icpName: string;
  won: number;
  lost: number;
  open: number;
  totalValue: number;
};

type WinLossSegment = {
  segmentId: string;
  segmentName: string;
  icpName: string;
  won: number;
  lost: number;
  open: number;
};

type LossReason = {
  category: string;
  tag: string;
  count: number;
  avgSeverity: number | null;
};

type RequestByIcp = {
  icpName: string;
  requestCount: number;
  topType: string | null;
};

function EmptyState() {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      No data yet. Data will appear as you track deals and collect feedback.
    </p>
  );
}

function winRate(won: number, lost: number): string {
  const total = won + lost;
  if (total === 0) return "--";
  return `${Math.round((won / total) * 100)}%`;
}

function WinLossByIcpCard({ data }: { data: WinLossIcp[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Win/Loss by ICP</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ICP</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Lost</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Win Rate</TableHead>
                <TableHead>Won Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const closedDeals = row.won + row.lost;
                const lowConfidence = closedDeals < MIN_DEALS_FOR_CONFIDENCE;
                return (
                  <TableRow key={row.icpId}>
                    <TableCell className="font-medium">{row.icpName}</TableCell>
                    <TableCell>{row.won}</TableCell>
                    <TableCell>{row.lost}</TableCell>
                    <TableCell>{row.open}</TableCell>
                    <TableCell>
                      <span className={lowConfidence ? "text-muted-foreground" : undefined}>
                        {winRate(row.won, row.lost)}
                      </span>
                      {lowConfidence && closedDeals > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({closedDeals} deals)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.totalValue > 0
                        ? `$${row.totalValue.toLocaleString()}`
                        : "--"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function WinLossBySegmentCard({ data }: { data: WinLossSegment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Win/Loss by Segment</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>ICP</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Lost</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Win Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const closedDeals = row.won + row.lost;
                const lowConfidence = closedDeals < MIN_DEALS_FOR_CONFIDENCE;
                return (
                  <TableRow key={row.segmentId}>
                    <TableCell className="font-medium">{row.segmentName}</TableCell>
                    <TableCell>{row.icpName}</TableCell>
                    <TableCell>{row.won}</TableCell>
                    <TableCell>{row.lost}</TableCell>
                    <TableCell>{row.open}</TableCell>
                    <TableCell>
                      <span className={lowConfidence ? "text-muted-foreground" : undefined}>
                        {winRate(row.won, row.lost)}
                      </span>
                      {lowConfidence && closedDeals > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({closedDeals} deals)
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TopLossReasonsCard({ data }: { data: LossReason[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Loss Reasons</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No loss data yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Avg Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={`${row.category}-${row.tag}-${idx}`}>
                  <TableCell className="font-medium">{row.category}</TableCell>
                  <TableCell>{row.tag}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>
                    {row.avgSeverity != null
                      ? row.avgSeverity.toFixed(1)
                      : "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RequestsByIcpCard({ data }: { data: RequestByIcp[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Requests by ICP</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No requests yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ICP</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Most Common Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.icpName}>
                  <TableCell className="font-medium">{row.icpName}</TableCell>
                  <TableCell>{row.requestCount}</TableCell>
                  <TableCell>
                    {row.topType
                      ? (TYPE_LABELS[row.topType] ?? row.topType)
                      : "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function InsightsView({
  winLossByIcp,
  winLossBySegment,
  topLossReasons,
  requestsByIcp,
}: {
  winLossByIcp: WinLossIcp[];
  winLossBySegment: WinLossSegment[];
  topLossReasons: LossReason[];
  requestsByIcp: RequestByIcp[];
}) {
  return (
    <div className="grid gap-6">
      <WinLossByIcpCard data={winLossByIcp} />
      <WinLossBySegmentCard data={winLossBySegment} />
      <TopLossReasonsCard data={topLossReasons} />
      <RequestsByIcpCard data={requestsByIcp} />
    </div>
  );
}
