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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ShieldAlert,
  User,
  Building2,
  Clock,
  Ban,
  CheckCircle,
  History,
  AlertTriangle,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type RiskLevel = "GREEN" | "YELLOW" | "RED";
type ComplianceStatus = "ESCALATED" | "UNDER_REVIEW" | "CLOSED_PERMANENT" | "CLOSED_CLEARED";

interface ComplianceCase {
  id: string;
  ticketId: string;
  entityType: "user" | "company" | "transaction" | "transport" | "wallet";
  entityId: string;
  score: number;
  level: RiskLevel;
  lastEvent: string;
  escalatedAt: Date;
  escalatedBy: string;
  status: ComplianceStatus;
  escalationReason: string;
  auditTrail: AuditEntry[];
}

interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details?: string;
}

interface ComplianceCasesListProps {
  cases: ComplianceCase[];
  onCaseSelect: (caseId: string) => void;
  onPermanentBlock: (ticketId: string, reason: string) => Promise<void>;
  onClear: (ticketId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getStatusColor = (status: ComplianceStatus): string => {
  switch (status) {
    case "ESCALATED":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "UNDER_REVIEW":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "CLOSED_PERMANENT":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "CLOSED_CLEARED":
      return "bg-green-500/10 text-green-600 border-green-500/20";
  }
};

const getStatusLabel = (status: ComplianceStatus): string => {
  switch (status) {
    case "ESCALATED":
      return "Eskaliert";
    case "UNDER_REVIEW":
      return "In Prüfung";
    case "CLOSED_PERMANENT":
      return "Gesperrt";
    case "CLOSED_CLEARED":
      return "Freigegeben";
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

export function ComplianceCasesList({
  cases,
  onCaseSelect,
  onPermanentBlock,
  onClear,
  isLoading = false,
}: ComplianceCasesListProps) {
  const [selectedCase, setSelectedCase] = React.useState<ComplianceCase | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = React.useState(false);
  const [clearDialogOpen, setClearDialogOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const activeCases = cases.filter(
    (c) => c.status === "ESCALATED" || c.status === "UNDER_REVIEW"
  ).length;

  const handleBlock = async () => {
    if (selectedCase) {
      await onPermanentBlock(selectedCase.ticketId, reason);
      setBlockDialogOpen(false);
      setReason("");
      setSelectedCase(null);
    }
  };

  const handleClear = async () => {
    if (selectedCase) {
      await onClear(selectedCase.ticketId, reason);
      setClearDialogOpen(false);
      setReason("");
      setSelectedCase(null);
    }
  };

  return (
    <>
      <Card className="border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <ShieldAlert className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Compliance Cases
                <Badge variant="outline" className="text-xs">
                  Admin/Compliance Only
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeCases} aktive Fälle zur Prüfung
              </p>
            </div>
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
                <TableHead>Eskaliert am</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Keine Compliance-Fälle vorhanden
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-purple-500/5"
                    onClick={() => {
                      setSelectedCase(c);
                      onCaseSelect(c.id);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {c.entityType === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
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
                      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                        🔴 {c.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{c.lastEvent}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(c.escalatedAt, "dd.MM.yyyy HH:mm", { locale: de })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(c.status)}>
                        {getStatusLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Selected Case Detail */}
      {selectedCase && (
        <Card className="mt-4 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-lg">Fall: {selectedCase.ticketId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Escalation Reason</Label>
                <p className="font-medium">{selectedCase.escalationReason}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Eskaliert von</Label>
                <p className="font-medium">{selectedCase.escalatedBy}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Eskaliert am</Label>
                <p className="font-medium">
                  {format(selectedCase.escalatedAt, "dd.MM.yyyy HH:mm:ss", { locale: de })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Bisherige Entscheidungen</Label>
                <p className="font-medium">
                  {selectedCase.auditTrail.filter((a) => a.action.includes("RELEASED")).length}x Freigaben in den letzten 7 Tagen
                </p>
              </div>
            </div>

            <Separator />

            {/* Audit Trail */}
            <div>
              <Label className="text-muted-foreground flex items-center gap-2 mb-3">
                <History className="h-4 w-4" />
                Full Audit Trail
              </Label>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {selectedCase.auditTrail.map((entry, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32">
                      {format(entry.timestamp, "dd.MM.yyyy HH:mm", { locale: de })}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        entry.action === "ESCALATED"
                          ? "bg-purple-500/10 text-purple-600"
                          : entry.action === "BLOCKED"
                          ? "bg-red-500/10 text-red-600"
                          : entry.action === "RELEASED"
                          ? "bg-green-500/10 text-green-600"
                          : ""
                      }
                    >
                      {entry.action}
                    </Badge>
                    <span className="text-muted-foreground">{entry.details}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Final Actions */}
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => setBlockDialogOpen(true)}
                disabled={isLoading || selectedCase.status === "CLOSED_PERMANENT"}
              >
                <Ban className="h-4 w-4 mr-2" />
                Dauerhaft sperren
              </Button>
              <Button
                variant="outline"
                className="border-green-500/50 hover:bg-green-500/10 hover:text-green-600"
                onClick={() => setClearDialogOpen(true)}
                disabled={isLoading || selectedCase.status === "CLOSED_CLEARED"}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Nach Prüfung freigeben
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Dauerhaft sperren
            </DialogTitle>
            <DialogDescription>
              Der Account wird dauerhaft gesperrt. Der Risk Score bleibt hoch.
              Das Ticket wird mit Grund "PERMANENT_BLOCK" geschlossen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="block-reason">Begründung</Label>
            <Textarea
              id="block-reason"
              placeholder="z.B. Betrugsverdacht bestätigt - Multiple Fraud-Indikatoren"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={isLoading || !reason}>
              Dauerhaft sperren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Nach Prüfung freigeben
            </DialogTitle>
            <DialogDescription>
              Der Account wird wieder aktiviert. Der Risk Score wird reduziert.
              Das Ticket wird mit Grund "CLEARED" geschlossen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="clear-reason">Begründung</Label>
            <Textarea
              id="clear-reason"
              placeholder="z.B. Verifikation erfolgreich - Alle Dokumente geprüft und bestätigt"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleClear}
              disabled={isLoading || !reason}
            >
              Freigeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ComplianceCasesList;
