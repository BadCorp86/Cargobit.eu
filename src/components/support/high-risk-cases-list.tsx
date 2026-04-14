"use client";

import * as React from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  User,
  Building2,
  CreditCard,
  Clock,
  ExternalLink,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type RiskLevel = "GREEN" | "YELLOW" | "RED";
type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED" | "WAITING_FOR_USER";

interface HighRiskCase {
  id: string;
  entityType: "user" | "company" | "transaction" | "transport" | "wallet";
  entityId: string;
  score: number;
  level: RiskLevel;
  lastEvent: string;
  timestamp: Date;
  status: TicketStatus;
  triggeredRules: string[];
}

interface HighRiskCasesListProps {
  cases: HighRiskCase[];
  onCaseSelect: (caseId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getRiskLevelColor = (level: RiskLevel): string => {
  switch (level) {
    case "GREEN":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "YELLOW":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "RED":
      return "bg-red-500/10 text-red-600 border-red-500/20";
  }
};

const getStatusColor = (status: TicketStatus): string => {
  switch (status) {
    case "OPEN":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "IN_PROGRESS":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "WAITING_FOR_USER":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "RESOLVED":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "ESCALATED":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
  }
};

const getStatusLabel = (status: TicketStatus): string => {
  switch (status) {
    case "OPEN":
      return "Offen";
    case "IN_PROGRESS":
      return "In Bearbeitung";
    case "WAITING_FOR_USER":
      return "Wartet auf User";
    case "RESOLVED":
      return "Gelöst";
    case "ESCALATED":
      return "Eskaliert";
  }
};

const getEntityIcon = (type: string) => {
  switch (type) {
    case "user":
      return <User className="h-4 w-4" />;
    case "company":
      return <Building2 className="h-4 w-4" />;
    case "transaction":
    case "wallet":
      return <CreditCard className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 61) return "text-red-500";
  if (score >= 31) return "text-yellow-500";
  return "text-green-500";
};

// ============================================
// MAIN COMPONENT
// ============================================

export function HighRiskCasesList({
  cases,
  onCaseSelect,
  onRefresh,
  isLoading = false,
}: HighRiskCasesListProps) {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredCases = React.useMemo(() => {
    return cases.filter((c) => {
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesSearch =
        searchTerm === "" ||
        c.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [cases, statusFilter, searchTerm]);

  const openCases = cases.filter((c) => c.status === "OPEN").length;
  const inProgressCases = cases.filter((c) => c.status === "IN_PROGRESS").length;

  return (
    <Card className="border-red-500/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-xl">High-Risk Cases</CardTitle>
              <p className="text-sm text-muted-foreground">
                {openCases} offen · {inProgressCases} in Bearbeitung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aktualisieren</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 pt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="OPEN">Offen</SelectItem>
                <SelectItem value="IN_PROGRESS">In Bearbeitung</SelectItem>
                <SelectItem value="WAITING_FOR_USER">Wartet auf User</SelectItem>
                <SelectItem value="ESCALATED">Eskaliert</SelectItem>
                <SelectItem value="RESOLVED">Gelöst</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Entity ID oder Ticket ID suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Level</TableHead>
              <TableHead>Letztes Event</TableHead>
              <TableHead>Zeit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Keine Fälle gefunden
                </TableCell>
              </TableRow>
            ) : (
              filteredCases.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-red-500/5"
                  onClick={() => onCaseSelect(c.id)}
                >
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getEntityIcon(c.entityType)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {c.entityId}
                    </code>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold text-lg ${getScoreColor(c.score)}`}>
                      {c.score}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={getRiskLevelColor(c.level)}>
                      {c.level === "RED" ? "🔴" : c.level === "YELLOW" ? "🟡" : "🟢"} {c.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{c.lastEvent}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(c.timestamp, "HH:mm:ss", { locale: de })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(c.status)}>
                      {getStatusLabel(c.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Zeige {filteredCases.length} von {cases.length} Fällen
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              {"<"} Prev
            </Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Next {">"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HighRiskCasesList;
