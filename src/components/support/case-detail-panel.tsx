"use client";

import * as React from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  ShieldAlert,
  Clock,
  AlertCircle,
  MapPin,
  CreditCard,
  Calendar,
  User,
  Building2,
  History,
  Send,
  Ban,
  AlertTriangle,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type RiskLevel = "GREEN" | "YELLOW" | "RED";
type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED" | "WAITING_FOR_USER";

interface TriggeredRule {
  id: string;
  name: string;
  points: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

interface ContextData {
  amount?: number;
  currency?: string;
  ibanAge?: number;
  userAge?: number;
  transactionCount?: number;
  geoLocation?: string;
  lastAction?: string;
  targetIban?: string;
}

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: "BLOCKED" | "TICKET_CREATED" | "SLACK_SENT" | "EMAIL_SENT" | "SMS_SENT" | "RISK_EVAL" | "REQUEST";
  description: string;
  icon?: string;
}

interface CaseDetail {
  id: string;
  ticketId: string;
  entityType: "user" | "company" | "transaction" | "transport" | "wallet";
  entityId: string;
  userId: string;
  action: string;
  score: number;
  level: RiskLevel;
  status: TicketStatus;
  triggeredRules: TriggeredRule[];
  context: ContextData;
  timeline: TimelineEvent[];
  createdAt: Date;
}

interface CaseDetailPanelProps {
  caseDetail: CaseDetail | null;
  onBack: () => void;
  onRelease: (ticketId: string, reason: string) => Promise<void>;
  onRequestVerification: (ticketId: string, type: string, comment: string) => Promise<void>;
  onEscalate: (ticketId: string, action: "block" | "escalate", reason: string) => Promise<void>;
  isLoading?: boolean;
}

// ============================================
// SCORE CIRCLE COMPONENT
// ============================================

function ScoreCircle({ score, level }: { score: number; level: RiskLevel }) {
  const getColor = () => {
    switch (level) {
      case "GREEN":
        return { stroke: "#2ECC71", text: "text-green-500", bg: "bg-green-500/10" };
      case "YELLOW":
        return { stroke: "#F1C40F", text: "text-yellow-500", bg: "bg-yellow-500/10" };
      case "RED":
        return { stroke: "#E74C3C", text: "text-red-500", bg: "bg-red-500/10" };
    }
  };

  const colors = getColor();
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center p-4 rounded-xl ${colors.bg}`}>
      <svg width="140" height="140" className="transform -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-muted/20"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={colors.stroke}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${colors.text}`}>{score}</span>
        <span className={`text-sm font-medium ${colors.text}`}>{level}</span>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CaseDetailPanel({
  caseDetail,
  onBack,
  onRelease,
  onRequestVerification,
  onEscalate,
  isLoading = false,
}: CaseDetailPanelProps) {
  const [releaseDialogOpen, setReleaseDialogOpen] = React.useState(false);
  const [verificationDialogOpen, setVerificationDialogOpen] = React.useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = React.useState(false);
  const [escalateAction, setEscalateAction] = React.useState<"block" | "escalate">("escalate");

  const [releaseReason, setReleaseReason] = React.useState("");
  const [verificationType, setVerificationType] = React.useState("DOCUMENT_UPLOAD");
  const [verificationComment, setVerificationComment] = React.useState("");
  const [escalateReason, setEscalateReason] = React.useState("");

  if (!caseDetail) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Kein Fall ausgewählt</p>
        </CardContent>
      </Card>
    );
  }

  const handleRelease = async () => {
    await onRelease(caseDetail.ticketId, releaseReason);
    setReleaseDialogOpen(false);
    setReleaseReason("");
  };

  const handleVerification = async () => {
    await onRequestVerification(caseDetail.ticketId, verificationType, verificationComment);
    setVerificationDialogOpen(false);
    setVerificationType("DOCUMENT_UPLOAD");
    setVerificationComment("");
  };

  const handleEscalate = async () => {
    await onEscalate(caseDetail.ticketId, escalateAction, escalateReason);
    setEscalateDialogOpen(false);
    setEscalateReason("");
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "BLOCKED":
        return <Ban className="h-4 w-4 text-red-500" />;
      case "TICKET_CREATED":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "SLACK_SENT":
        return <Send className="h-4 w-4 text-purple-500" />;
      case "EMAIL_SENT":
        return <Send className="h-4 w-4 text-green-500" />;
      case "SMS_SENT":
        return <Send className="h-4 w-4 text-orange-500" />;
      case "RISK_EVAL":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zu Cases
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <code className="text-sm bg-muted px-2 py-1 rounded">{caseDetail.ticketId}</code>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score & Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Risk Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <ScoreCircle score={caseDetail.score} level={caseDetail.level} />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Entity: <code className="bg-muted px-1 rounded">{caseDetail.entityId}</code></p>
              <p>Action: <strong>{caseDetail.action}</strong></p>
            </div>
          </CardContent>
        </Card>

        {/* Triggered Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Triggered Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {caseDetail.triggeredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {rule.severity === "HIGH" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : rule.severity === "MEDIUM" ? (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm">{rule.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{rule.points}
                  </Badge>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between text-sm font-medium">
              <span>Total Score:</span>
              <span className={caseDetail.score >= 61 ? "text-red-500" : "text-yellow-500"}>
                {caseDetail.score} → {caseDetail.level}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {caseDetail.context.amount && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <CreditCard className="h-3 w-3" />
                  Betrag
                </div>
                <p className="font-medium">
                  {caseDetail.context.amount.toLocaleString("de-DE")} {caseDetail.context.currency || "EUR"}
                </p>
              </div>
            )}
            {caseDetail.context.ibanAge !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Calendar className="h-3 w-3" />
                  IBAN-Alter
                </div>
                <p className="font-medium">{caseDetail.context.ibanAge} Tage</p>
              </div>
            )}
            {caseDetail.context.userAge !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <User className="h-3 w-3" />
                  User-Alter
                </div>
                <p className="font-medium">{caseDetail.context.userAge} Tage</p>
              </div>
            )}
            {caseDetail.context.transactionCount !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <History className="h-3 w-3" />
                  Transaktionen
                </div>
                <p className="font-medium">{caseDetail.context.transactionCount}</p>
              </div>
            )}
            {caseDetail.context.geoLocation && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MapPin className="h-3 w-3" />
                  Geo-Location
                </div>
                <p className="font-medium">{caseDetail.context.geoLocation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Event Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {caseDetail.timeline.map((event, index) => (
              <div key={event.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {getEventIcon(event.type)}
                  </div>
                  {index < caseDetail.timeline.length - 1 && (
                    <div className="w-px h-6 bg-muted my-1" />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{event.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(event.timestamp, "dd.MM.yyyy HH:mm:ss", { locale: de })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-t-4 border-t-red-500">
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2 border-green-500/50 hover:bg-green-500/10 hover:text-green-600"
              onClick={() => setReleaseDialogOpen(true)}
              disabled={isLoading || caseDetail.status === "RESOLVED"}
            >
              <CheckCircle className="h-4 w-4" />
              Freigeben
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-600"
              onClick={() => setVerificationDialogOpen(true)}
              disabled={isLoading || caseDetail.status === "RESOLVED"}
            >
              <FileText className="h-4 w-4" />
              Verifikation anfordern
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-red-500/50 hover:bg-red-500/10 hover:text-red-600"
              onClick={() => {
                setEscalateAction("block");
                setEscalateDialogOpen(true);
              }}
              disabled={isLoading || caseDetail.status === "RESOLVED"}
            >
              <Ban className="h-4 w-4" />
              Nutzer sperren
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-600"
              onClick={() => {
                setEscalateAction("escalate");
                setEscalateDialogOpen(true);
              }}
              disabled={isLoading || caseDetail.status === "ESCALATED"}
            >
              <ShieldAlert className="h-4 w-4" />
              Zur Compliance eskalieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Release Dialog */}
      <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Fall freigeben
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bist du sicher, dass du diesen Fall freigeben möchtest? Die blockierte Aktion wird
              ausgeführt und das Ticket wird als gelöst markiert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="release-reason">Begründung (optional)</Label>
            <Textarea
              id="release-reason"
              placeholder="z.B. Manuelle Verifikation abgeschlossen - ID bestätigt"
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRelease}
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              Freigeben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verification Dialog */}
      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-yellow-500" />
              Verifikation anfordern
            </DialogTitle>
            <DialogDescription>
              Fordere zusätzliche Verifikation vom Nutzer an. Der User erhält eine Task-Benachrichtigung.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verification-type">Verifikations-Typ</Label>
              <Select value={verificationType} onValueChange={setVerificationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Wähle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCUMENT_UPLOAD">Dokument hochladen</SelectItem>
                  <SelectItem value="SELFIE_VERIFICATION">Selfie-Verifikation</SelectItem>
                  <SelectItem value="COMPANY_DOCUMENTS">Firmenunterlagen</SelectItem>
                  <SelectItem value="IBAN_VERIFICATION">IBAN-Verifikation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-comment">Kommentar an User</Label>
              <Textarea
                id="verification-comment"
                placeholder="z.B. Bitte laden Sie einen gültigen Ausweis (Vorder- und Rückseite) hoch."
                value={verificationComment}
                onChange={(e) => setVerificationComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerificationDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleVerification} disabled={isLoading || !verificationComment}>
              Anfordern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {escalateAction === "block" ? (
                <>
                  <Ban className="h-5 w-5 text-red-500" />
                  Nutzer sperren
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-purple-500" />
                  Zur Compliance eskalieren
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {escalateAction === "block"
                ? "Der Account wird gesperrt und das Ticket geschlossen."
                : "Der Fall wird an die Compliance-Abteilung eskaliert für weitere Prüfung."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="escalate-reason">Begründung</Label>
              <Textarea
                id="escalate-reason"
                placeholder={escalateAction === "block"
                  ? "z.B. Verdacht auf Betrug - Multiple High-Risk Events"
                  : "z.B. Komplexer Fall erfordert Compliance-Prüfung"
                }
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleEscalate}
              disabled={isLoading || !escalateReason}
              variant={escalateAction === "block" ? "destructive" : "default"}
            >
              {escalateAction === "block" ? "Sperren" : "Eskalieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseDetailPanel;
