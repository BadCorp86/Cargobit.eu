'use client';

/**
 * CargoBit Match Results Component
 * Displays ranked transporter matches with scores
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Star,
  MapPin,
  Truck,
  TrendingUp,
  Brain,
  Target,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface MatchData {
  id: string;
  transporterId: string;
  transporterName?: string;
  companyName?: string;
  rating: number;
  completedJobs: number;
  
  // Scores
  score: number;            // Total score (0-1)
  scoreBreakdown: {
    heuristic: number;      // 0-1
    ml: number;             // 0-1
    region: number;         // 0-0.4
    capacity: number;       // 0-0.4
    rating: number;         // 0-0.2
  };
  
  // Flags
  hasStripeConnect: boolean;
  isRecommended: boolean;
  matchReasons: string[];
  
  // Status
  status: 'pending' | 'notified' | 'accepted' | 'rejected';
  notifiedAt?: Date;
  expiresAt?: Date;
}

interface MatchResultsProps {
  jobId: string;
  matches: MatchData[];
  onViewTransporter?: (transporterId: string) => void;
  onInviteTransporter?: (transporterId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export function MatchResults({ 
  jobId, 
  matches,
  onViewTransporter,
  onInviteTransporter 
}: MatchResultsProps) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Ausgezeichnet';
    if (score >= 0.7) return 'Sehr gut';
    if (score >= 0.5) return 'Gut';
    if (score >= 0.3) return 'Akzeptabel';
    return 'Niedrig';
  };
  
  const getInitials = (name?: string) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          Matching läuft... Bitte warten Sie einen Moment.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg">
          Passende Transporteure ({matches.length})
        </h3>
        <div className="text-sm text-muted-foreground">
          Sortiert nach Score
        </div>
      </div>
      
      {matches.map((match, index) => (
        <Card 
          key={match.id}
          className={`${match.isRecommended ? 'border-blue-500' : ''}`}
        >
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                {index + 1}
              </div>
              
              {/* Avatar */}
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(match.companyName || match.transporterName)}
                </AvatarFallback>
              </Avatar>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {match.companyName || match.transporterName || 'Transporteur'}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm">{match.rating.toFixed(1)}</span>
                  </div>
                  {match.isRecommended && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Empfohlen
                    </Badge>
                  )}
                  {match.hasStripeConnect && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Stripe Connect aktiviert
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    {match.completedJobs} Aufträge
                  </span>
                </div>
                
                {/* Match Reasons */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {match.matchReasons.map((reason, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* Score */}
              <div className="text-right min-w-[120px]">
                <div className={`text-2xl font-bold ${getScoreColor(match.score)}`}>
                  {Math.round(match.score * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {getScoreLabel(match.score)}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm"
                  onClick={() => onViewTransporter?.(match.transporterId)}
                >
                  Profil
                </Button>
                {match.status === 'pending' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onInviteTransporter?.(match.transporterId)}
                  >
                    Einladen
                  </Button>
                )}
              </div>
            </div>
            
            {/* Expandable Score Breakdown */}
            <div className="mt-4">
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setExpandedMatch(
                  expandedMatch === match.id ? null : match.id
                )}
              >
                {expandedMatch === match.id ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Score-Details
              </button>
              
              {expandedMatch === match.id && (
                <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  {/* Heuristic Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Heuristik</span>
                      <span className="text-sm">{Math.round(match.scoreBreakdown.heuristic * 100)}%</span>
                    </div>
                    <Progress value={match.scoreBreakdown.heuristic * 100} className="h-2" />
                  </div>
                  
                  {/* ML Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Brain className="w-4 h-4" />
                        ML-Score
                      </span>
                      <span className="text-sm">{Math.round(match.scoreBreakdown.ml * 100)}%</span>
                    </div>
                    <Progress value={match.scoreBreakdown.ml * 100} className="h-2" />
                  </div>
                  
                  {/* Region Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Region</span>
                      <span className="text-sm">{Math.round(match.scoreBreakdown.region * 100)}%</span>
                    </div>
                    <Progress value={match.scoreBreakdown.region / 0.4 * 100} className="h-2" />
                  </div>
                  
                  {/* Capacity Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Kapazität</span>
                      <span className="text-sm">{Math.round(match.scoreBreakdown.capacity * 100)}%</span>
                    </div>
                    <Progress value={match.scoreBreakdown.capacity / 0.4 * 100} className="h-2" />
                  </div>
                  
                  {/* Rating Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Bewertung</span>
                      <span className="text-sm">{Math.round(match.scoreBreakdown.rating * 100)}%</span>
                    </div>
                    <Progress value={match.scoreBreakdown.rating / 0.2 * 100} className="h-2" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Score Formula Explanation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium mb-2">Score-Berechnung:</p>
        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
          S = 0.5 × H + 0.5 × M
        </code>
        <p className="mt-2">
          H = Heuristik-Score (Region + Kapazität + Bewertung)
          <br />
          M = ML-Score (Wahrscheinlichkeit für erfolgreichen Abschluss)
        </p>
      </div>
    </div>
  );
}
