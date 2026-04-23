'use client';

/**
 * CargoBit Bid List Component
 * Displays offers from transporters with accept/reject actions
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Euro,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  Truck,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface BidData {
  id: string;
  transporterId: string;
  transporterName?: string;
  transporterRating: number;
  transporterCompletedJobs: number;
  vehicleType?: string;
  price: number;
  currency: string;
  message?: string;
  estimatedDuration?: number;  // minutes
  status: BidStatus;
  createdAt: Date;
  validUntil?: Date;
  isRecommended?: boolean;
}

interface BidListProps {
  jobId: string;
  bids: BidData[];
  userRole: 'shipper' | 'transporter';
  onAcceptBid?: (bidId: string) => Promise<void>;
  onRejectBid?: (bidId: string, reason?: string) => Promise<void>;
  onWithdrawBid?: (bidId: string) => Promise<void>;
  isLoading?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function BidList({ 
  jobId, 
  bids, 
  userRole,
  onAcceptBid,
  onRejectBid,
  onWithdrawBid,
  isLoading = false
}: BidListProps) {
  const [selectedBid, setSelectedBid] = useState<BidData | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const handleAccept = async () => {
    if (!selectedBid || !onAcceptBid) return;
    
    setProcessing(true);
    try {
      await onAcceptBid(selectedBid.id);
      setShowAcceptDialog(false);
      setSelectedBid(null);
    } catch (error) {
      console.error('Accept failed:', error);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleReject = async () => {
    if (!selectedBid || !onRejectBid) return;
    
    setProcessing(true);
    try {
      await onRejectBid(selectedBid.id);
      setShowRejectDialog(false);
      setSelectedBid(null);
    } catch (error) {
      console.error('Reject failed:', error);
    } finally {
      setProcessing(false);
    }
  };
  
  const pendingBids = bids.filter(b => b.status === 'pending');
  const acceptedBid = bids.find(b => b.status === 'accepted');
  const rejectedBids = bids.filter(b => b.status === 'rejected');
  
  if (bids.length === 0) {
    return (
      <div className="text-center py-8">
        <Truck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          {userRole === 'shipper' 
            ? 'Noch keine Angebote vorhanden. Transporteure wurden benachrichtigt.'
            : 'Du hast noch keine Angebote abgegeben.'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Accepted Bid (if any) */}
      {acceptedBid && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-green-700">
                Angenommenes Angebot
              </CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <BidItem 
              bid={acceptedBid} 
              showActions={false}
              isAccepted
            />
          </CardContent>
        </Card>
      )}
      
      {/* Pending Bids */}
      {pendingBids.length > 0 && !acceptedBid && (
        <div className="space-y-3">
          <h3 className="font-medium text-lg">
            Offene Angebote ({pendingBids.length})
          </h3>
          
          {pendingBids.map(bid => (
            <Card key={bid.id} className={bid.isRecommended ? 'border-blue-500' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <BidItem 
                    bid={bid}
                    showActions={userRole === 'shipper'}
                    onAccept={() => {
                      setSelectedBid(bid);
                      setShowAcceptDialog(true);
                    }}
                    onReject={() => {
                      setSelectedBid(bid);
                      setShowRejectDialog(true);
                    }}
                    isRecommended={bid.isRecommended}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Rejected Bids (collapsed) */}
      {rejectedBids.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Abgelehnte Angebote ({rejectedBids.length})
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {rejectedBids.map(bid => (
              <Card key={bid.id} className="bg-gray-50">
                <CardContent className="pt-4">
                  <BidItem bid={bid} showActions={false} />
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
      
      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Angebot annehmen?</DialogTitle>
            <DialogDescription>
              Du akzeptierst das Angebot von {selectedBid?.transporterName || 'Transporteur'} über{' '}
              <strong>{selectedBid?.price && formatPrice(selectedBid.price)}</strong>.
              Der Betrag wird von deinem Wallet abgebucht.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAcceptDialog(false)}
              disabled={processing}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleAccept}
              disabled={processing}
            >
              {processing ? 'Wird verarbeitet...' : 'Angebot annehmen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Angebot ablehnen?</DialogTitle>
            <DialogDescription>
              Möchtest du das Angebot von {selectedBid?.transporterName || 'Transporteur'} ablehnen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
              disabled={processing}
            >
              Abbrechen
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? 'Wird verarbeitet...' : 'Ablehnen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// BID ITEM SUB-COMPONENT
// ============================================

interface BidItemProps {
  bid: BidData;
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  isAccepted?: boolean;
  isRecommended?: boolean;
}

function BidItem({ 
  bid, 
  showActions = false, 
  onAccept, 
  onReject,
  isAccepted = false,
  isRecommended = false
}: BidItemProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };
  
  const getInitials = (name?: string) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  return (
    <div className="flex items-start gap-4 w-full">
      {/* Avatar */}
      <Avatar className="h-12 w-12">
        <AvatarFallback className="bg-primary/10 text-primary">
          {getInitials(bid.transporterName)}
        </AvatarFallback>
      </Avatar>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {bid.transporterName || 'Transporteur'}
          </span>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm">{bid.transporterRating.toFixed(1)}</span>
          </div>
          {isRecommended && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Empfohlen
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          {bid.vehicleType && (
            <span className="flex items-center gap-1">
              <Truck className="w-4 h-4" />
              {bid.vehicleType}
            </span>
          )}
          <span>{bid.transporterCompletedJobs} Aufträge</span>
          {bid.estimatedDuration && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {bid.estimatedDuration} min
            </span>
          )}
        </div>
        
        {bid.message && (
          <p className="mt-2 text-sm bg-gray-50 rounded p-2">
            <MessageSquare className="w-4 h-4 inline mr-1 text-muted-foreground" />
            {bid.message}
          </p>
        )}
      </div>
      
      {/* Price */}
      <div className="text-right">
        <div className={`text-xl font-bold ${isAccepted ? 'text-green-600' : ''}`}>
          {formatPrice(bid.price)}
        </div>
        {bid.validUntil && (
          <div className="text-xs text-muted-foreground mt-1">
            Gültig bis: {new Date(bid.validUntil).toLocaleDateString('de-DE')}
          </div>
        )}
      </div>
      
      {/* Actions */}
      {showActions && bid.status === 'pending' && (
        <div className="flex flex-col gap-2 ml-4">
          <Button size="sm" onClick={onAccept}>
            Annehmen
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            Ablehnen
          </Button>
        </div>
      )}
    </div>
  );
}
