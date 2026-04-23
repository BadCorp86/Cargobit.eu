'use client';

/**
 * CargoBit Shipper Dashboard
 * End-to-End Flow: Job → Match → Bid → Book → Complete
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JobList, type JobCardData, type JobStatus } from '@/components/jobs/job-card';
import { BidList, type BidData } from '@/components/bids/bid-list';
import { MatchResults, type MatchData } from '@/components/matching/match-results';
import { 
  Plus, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  Euro,
  TrendingUp
} from 'lucide-react';

// ============================================
// MOCK DATA (Replace with API calls)
// ============================================

const mockJobs: JobCardData[] = [
  {
    id: 'job_001',
    status: 'matched',
    pickup: {
      city: 'München',
      country: 'DE',
      datetime: new Date('2026-04-22T08:00:00'),
    },
    delivery: {
      city: 'Wien',
      country: 'AT',
      datetime: new Date('2026-04-22T16:00:00'),
    },
    description: '5 Paletten Elektronik',
    weightKg: 2500,
    budget: 650,
    bidCount: 3,
    lowestBid: 580,
    createdAt: new Date('2026-04-19T10:30:00'),
  },
  {
    id: 'job_002',
    status: 'in_progress',
    pickup: {
      city: 'Hamburg',
      country: 'DE',
      datetime: new Date('2026-04-18T14:00:00'),
    },
    delivery: {
      city: 'Berlin',
      country: 'DE',
      datetime: new Date('2026-04-19T10:00:00'),
    },
    description: 'Möbeltransport',
    weightKg: 1800,
    agreedPrice: 420,
    assignedTransporter: {
      companyName: 'Schnell Transport GmbH',
      rating: 4.8,
    },
    createdAt: new Date('2026-04-17T09:15:00'),
  },
  {
    id: 'job_003',
    status: 'completed',
    pickup: {
      city: 'Frankfurt',
      country: 'DE',
      datetime: new Date('2026-04-15T06:00:00'),
    },
    delivery: {
      city: 'Stuttgart',
      country: 'DE',
      datetime: new Date('2026-04-15T14:00:00'),
    },
    description: 'Lebensmittel (gekühlt)',
    weightKg: 3200,
    agreedPrice: 550,
    assignedTransporter: {
      companyName: 'Kühl-Logistik Schmidt',
      rating: 4.6,
    },
    createdAt: new Date('2026-04-14T16:45:00'),
  },
];

const mockMatches: MatchData[] = [
  {
    id: 'match_001',
    transporterId: 'trans_001',
    transporterName: 'Max Müller',
    companyName: 'Müller Transporte',
    rating: 4.9,
    completedJobs: 156,
    score: 0.87,
    scoreBreakdown: {
      heuristic: 0.82,
      ml: 0.92,
      region: 0.4,
      capacity: 0.35,
      rating: 0.18,
    },
    hasStripeConnect: true,
    isRecommended: true,
    matchReasons: ['Region passt', 'Kapazität verfügbar', 'Top Bewertung', 'ML: Hohe Erfolgswahrscheinlichkeit'],
    status: 'pending',
  },
  {
    id: 'match_002',
    transporterId: 'trans_002',
    companyName: 'Schnell & Sicher GmbH',
    rating: 4.7,
    completedJobs: 89,
    score: 0.74,
    scoreBreakdown: {
      heuristic: 0.71,
      ml: 0.77,
      region: 0.35,
      capacity: 0.3,
      rating: 0.14,
    },
    hasStripeConnect: true,
    isRecommended: false,
    matchReasons: ['Region passt', 'Kapazität verfügbar'],
    status: 'pending',
  },
  {
    id: 'match_003',
    transporterId: 'trans_003',
    transporterName: 'Andreas Weber',
    companyName: 'Weber Logistics',
    rating: 4.5,
    completedJobs: 42,
    score: 0.62,
    scoreBreakdown: {
      heuristic: 0.58,
      ml: 0.66,
      region: 0.3,
      capacity: 0.25,
      rating: 0.1,
    },
    hasStripeConnect: false,
    isRecommended: false,
    matchReasons: ['Kapazität verfügbar'],
    status: 'pending',
  },
];

const mockBids: BidData[] = [
  {
    id: 'bid_001',
    transporterId: 'trans_001',
    transporterName: 'Max Müller',
    companyName: 'Müller Transporte',
    transporterRating: 4.9,
    transporterCompletedJobs: 156,
    vehicleType: 'SPRINTER',
    price: 580,
    currency: 'EUR',
    message: 'Kann morgen früh abholen. Direktfahrt ohne Umwege.',
    estimatedDuration: 240,
    status: 'pending',
    createdAt: new Date('2026-04-19T11:00:00'),
    validUntil: new Date('2026-04-20T11:00:00'),
    isRecommended: true,
  },
  {
    id: 'bid_002',
    transporterId: 'trans_002',
    companyName: 'Schnell & Sicher GmbH',
    transporterRating: 4.7,
    transporterCompletedJobs: 89,
    vehicleType: 'KOEFFER',
    price: 620,
    currency: 'EUR',
    message: 'Erfahrener Fahrer für Strecke München-Wien.',
    estimatedDuration: 280,
    status: 'pending',
    createdAt: new Date('2026-04-19T12:30:00'),
    validUntil: new Date('2026-04-20T12:30:00'),
  },
  {
    id: 'bid_003',
    transporterId: 'trans_003',
    transporterName: 'Andreas Weber',
    companyName: 'Weber Logistics',
    transporterRating: 4.5,
    transporterCompletedJobs: 42,
    vehicleType: 'PLANE',
    price: 550,
    currency: 'EUR',
    estimatedDuration: 320,
    status: 'pending',
    createdAt: new Date('2026-04-19T14:00:00'),
    validUntil: new Date('2026-04-20T14:00:00'),
  },
];

// ============================================
// DASHBOARD COMPONENT
// ============================================

export default function ShipperDashboard() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Stats
  const stats = {
    activeJobs: mockJobs.filter(j => !['completed', 'canceled'].includes(j.status)).length,
    pendingBids: mockBids.filter(b => b.status === 'pending').length,
    totalSpent: mockJobs.reduce((sum, j) => sum + (j.agreedPrice || 0), 0),
    completionRate: 95,
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">CargoBit Dashboard</h1>
              <p className="text-muted-foreground">Verlader-Übersicht</p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Neuer Auftrag
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktive Aufträge</p>
                  <p className="text-2xl font-bold">{stats.activeJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Offene Angebote</p>
                  <p className="text-2xl font-bold">{stats.pendingBids}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Euro className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ausgegeben</p>
                  <p className="text-2xl font-bold">{stats.totalSpent} €</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Erfolgsrate</p>
                  <p className="text-2xl font-bold">{stats.completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="bids">Angebote</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Meine Aufträge</h2>
              <JobList 
                jobs={mockJobs}
                userRole="shipper"
                onViewJob={(id) => {
                  setSelectedJobId(id);
                  if (mockJobs.find(j => j.id === id)?.status === 'matched') {
                    setActiveTab('bids');
                  }
                }}
              />
            </div>
          </TabsContent>
          
          {/* Matches Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle>Matching-Ergebnisse</CardTitle>
                <CardDescription>
                  Transporteure, die für deinen Auftrag München → Wien passen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MatchResults 
                  jobId="job_001"
                  matches={mockMatches}
                  onViewTransporter={(id) => console.log('View transporter:', id)}
                  onInviteTransporter={(id) => console.log('Invite transporter:', id)}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Bids Tab */}
          <TabsContent value="bids">
            <Card>
              <CardHeader>
                <CardTitle>Angebote für München → Wien</CardTitle>
                <CardDescription>
                  {mockBids.filter(b => b.status === 'pending').length} offene Angebote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BidList 
                  jobId="job_001"
                  bids={mockBids}
                  userRole="shipper"
                  onAcceptBid={async (bidId) => {
                    console.log('Accepting bid:', bidId);
                    // In production: API call
                  }}
                  onRejectBid={async (bidId) => {
                    console.log('Rejecting bid:', bidId);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* End-to-End Flow Diagram */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>End-to-End Flow</CardTitle>
            <CardDescription>
              Von der Auftragserstellung bis zur Zahlung
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {[
                { label: 'Auftrag erstellen', icon: Plus, status: 'done' },
                { label: 'Matching läuft', icon: Truck, status: 'done' },
                { label: 'Angebote erhalten', icon: Package, status: 'current' },
                { label: 'Angebot wählen', icon: CheckCircle, status: 'pending' },
                { label: 'Transport', icon: Truck, status: 'pending' },
                { label: 'Zahlung', icon: Euro, status: 'pending' },
              ].map((step, i) => (
                <div key={i} className="flex items-center">
                  <div className={`flex flex-col items-center ${
                    step.status === 'done' ? 'text-green-600' :
                    step.status === 'current' ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      step.status === 'done' ? 'bg-green-50 border-green-300' :
                      step.status === 'current' ? 'bg-blue-50 border-blue-300' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs mt-2 text-center max-w-[80px]">
                      {step.label}
                    </span>
                  </div>
                  {i < 5 && (
                    <div className={`w-12 h-0.5 mx-1 ${
                      step.status === 'done' ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
