'use client';

/**
 * CargoBit Job Card Component
 * Displays job details with status, route, and action buttons
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Calendar, 
  Package, 
  Clock,
  Euro,
  ChevronRight,
  CheckCircle,
  XCircle,
  Truck
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type JobStatus = 
  | 'open'
  | 'matched'
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'canceled';

export interface JobCardData {
  id: string;
  status: JobStatus;
  
  // Route
  pickup: {
    city: string;
    country: string;
    datetime: Date;
  };
  delivery: {
    city: string;
    country: string;
    datetime?: Date;
  };
  
  // Cargo
  description?: string;
  weightKg?: number;
  
  // Pricing
  budget?: number;
  agreedPrice?: number;
  
  // Bids
  bidCount?: number;
  lowestBid?: number;
  
  // Transporter
  assignedTransporter?: {
    companyName?: string;
    rating: number;
  };
  
  // Timestamps
  createdAt: Date;
}

interface JobCardProps {
  job: JobCardData;
  userRole: 'shipper' | 'transporter';
  onViewDetails?: () => void;
  onCreateBid?: () => void;
  onCancel?: () => void;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<JobStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle;
}> = {
  open: { label: 'Offen', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: Clock },
  matched: { label: 'Matches gefunden', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: CheckCircle },
  booked: { label: 'Gebucht', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  in_progress: { label: 'In Transit', color: 'text-orange-700', bgColor: 'bg-orange-50', icon: Truck },
  completed: { label: 'Abgeschlossen', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: CheckCircle },
  canceled: { label: 'Storniert', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
};

// ============================================
// COMPONENT
// ============================================

export function JobCard({ 
  job, 
  userRole,
  onViewDetails, 
  onCreateBid,
  onCancel 
}: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusConfig = STATUS_CONFIG[job.status];
  const StatusIcon = statusConfig.icon;
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };
  
  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Erstellt: {formatDate(job.createdAt)}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            #{job.id.slice(0, 8)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Route */}
        <div className="flex items-center gap-4">
          {/* Pickup */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-green-600" />
              <span>{job.pickup.city}</span>
              <span className="text-muted-foreground">{job.pickup.country}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(job.pickup.datetime)}</span>
            </div>
          </div>
          
          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
          
          {/* Delivery */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2 text-sm font-medium">
              <span>{job.delivery.city}</span>
              <span className="text-muted-foreground">{job.delivery.country}</span>
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            {job.delivery.datetime && (
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mt-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(job.delivery.datetime)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Cargo Info */}
        <div className="flex items-center gap-4 text-sm">
          {job.weightKg && (
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>{job.weightKg} kg</span>
            </div>
          )}
          {job.description && (
            <span className="text-muted-foreground truncate max-w-[200px]">
              {job.description}
            </span>
          )}
        </div>
        
        {/* Pricing */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {job.agreedPrice ? (
              <div className="flex items-center gap-1 font-semibold text-green-600">
                <Euro className="w-4 h-4" />
                <span>{formatPrice(job.agreedPrice)}</span>
              </div>
            ) : job.budget ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Euro className="w-4 h-4" />
                <span>Budget: {formatPrice(job.budget)}</span>
              </div>
            ) : null}
            
            {job.bidCount !== undefined && job.bidCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {job.bidCount} Angebot{job.bidCount !== 1 ? 'e' : ''}
                {job.lowestBid && ` ab ${formatPrice(job.lowestBid)}`}
              </Badge>
            )}
          </div>
          
          {/* Assigned Transporter */}
          {job.assignedTransporter && (
            <div className="text-sm">
              <span className="text-muted-foreground">Transporteur: </span>
              <span className="font-medium">
                {job.assignedTransporter.companyName || 'Unbekannt'}
              </span>
              <span className="text-yellow-500 ml-1">
                ★ {job.assignedTransporter.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onViewDetails}
          >
            Details
          </Button>
          
          {userRole === 'transporter' && job.status === 'open' && (
            <Button 
              size="sm"
              onClick={onCreateBid}
            >
              Angebot abgeben
            </Button>
          )}
          
          {userRole === 'shipper' && job.status === 'matched' && (
            <Button 
              variant="outline"
              size="sm"
              onClick={onViewDetails}
            >
              Angebote ansehen ({job.bidCount || 0})
            </Button>
          )}
          
          {userRole === 'shipper' && ['open', 'matched'].includes(job.status) && (
            <Button 
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onCancel}
            >
              Stornieren
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// JOB LIST COMPONENT
// ============================================

interface JobListProps {
  jobs: JobCardData[];
  userRole: 'shipper' | 'transporter';
  onViewJob?: (jobId: string) => void;
  onCreateBid?: (jobId: string) => void;
  onCancelJob?: (jobId: string) => void;
  emptyMessage?: string;
}

export function JobList({ 
  jobs, 
  userRole,
  onViewJob,
  onCreateBid,
  onCancelJob,
  emptyMessage = 'Keine Aufträge gefunden'
}: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          userRole={userRole}
          onViewDetails={() => onViewJob?.(job.id)}
          onCreateBid={() => onCreateBid?.(job.id)}
          onCancel={() => onCancelJob?.(job.id)}
        />
      ))}
    </div>
  );
}
