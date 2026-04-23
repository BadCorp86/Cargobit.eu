import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys
export const queryKeys = {
  orders: ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  transports: ['transports'] as const,
  transport: (id: string) => ['transports', id] as const,
  insurance: {
    quotes: ['insurance', 'quotes'] as const,
    quote: (id: string) => ['insurance', 'quote', id] as const,
    policies: ['insurance', 'policies'] as const,
    policy: (id: string) => ['insurance', 'policy', id] as const,
  },
  ads: {
    campaigns: ['ads', 'campaigns'] as const,
    campaign: (id: string) => ['ads', 'campaign', id] as const,
    slots: ['ads', 'slots'] as const,
  },
  wallet: {
    balance: ['wallet', 'balance'] as const,
    transactions: ['wallet', 'transactions'] as const,
  },
  partner: {
    onboarding: (userId: string) => ['partner', 'onboarding', userId] as const,
    application: (id: string) => ['partner', 'application', id] as const,
  },
};

// Insurance hooks
export function useInsuranceQuote(orderId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.insurance.quote(orderId),
    queryFn: async () => {
      const res = await fetch(`/api/insurance/quote?orderId=${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch quote');
      return res.json();
    },
    ...options,
  });
}

export function useInsurancePolicies(userId?: string) {
  return useQuery({
    queryKey: queryKeys.insurance.policies,
    queryFn: async () => {
      const res = await fetch(`/api/insurance/policies${userId ? `?userId=${userId}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch policies');
      return res.json();
    },
  });
}

export function useCreateInsurancePolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { quoteId: string; orderId: string; customerId: string }) => {
      const res = await fetch('/api/insurance/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create policy');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.insurance.policies });
    },
  });
}

// Ads hooks
export function useAdSlots() {
  return useQuery({
    queryKey: queryKeys.ads.slots,
    queryFn: async () => {
      const res = await fetch('/api/ads/slots');
      if (!res.ok) throw new Error('Failed to fetch ad slots');
      return res.json();
    },
  });
}

export function useAdCampaigns(partnerId?: string) {
  return useQuery({
    queryKey: queryKeys.ads.campaigns,
    queryFn: async () => {
      const res = await fetch(`/api/ads/campaign${partnerId ? `?partnerId=${partnerId}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
  });
}

export function useCreateAdCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      name: string;
      slotId: string;
      imageUrl: string;
      targetUrl: string;
      budgetEur: number;
      cpcEur?: number;
      cpmEur?: number;
      startDate: string;
      endDate?: string;
    }) => {
      const res = await fetch('/api/ads/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ads.campaigns });
    },
  });
}

export function useTrackAdImpression() {
  return useMutation({
    mutationFn: async (data: { campaignId: string; slotId: string; userId?: string; riskLevel?: string }) => {
      const res = await fetch('/api/ads/impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to track impression');
      return res.json();
    },
  });
}

export function useTrackAdClick() {
  return useMutation({
    mutationFn: async (data: { impressionId: string; campaignId: string }) => {
      const res = await fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to track click');
      return res.json();
    },
  });
}

// Partner hooks
export function usePartnerOnboarding(userId: string | null) {
  return useQuery({
    queryKey: userId ? queryKeys.partner.onboarding(userId) : ['partner', 'onboarding'],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const res = await fetch(`/api/partners/onboarding?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch onboarding status');
      return res.json();
    },
    enabled: !!userId,
  });
}

export function usePartnerRegister() {
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      companyName: string;
      contactPerson: string;
      phone: string;
      partnerType: 'INSURANCE' | 'ADVERTISER';
      insuranceProducts?: string[];
      advertisingBudget?: number;
      acceptedTerms: boolean;
      acceptedPrivacy: boolean;
    }) => {
      const res = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to register');
      }
      return res.json();
    },
  });
}

// Transport hooks
export function useTransports(filters?: {
  status?: string;
  riskLevel?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.riskLevel) params.set('riskLevel', filters.riskLevel);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);

  return useQuery({
    queryKey: [...queryKeys.transports, filters],
    queryFn: async () => {
      const res = await fetch(`/api/transports?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transports');
      return res.json();
    },
  });
}

export function useTransport(id: string) {
  return useQuery({
    queryKey: queryKeys.transport(id),
    queryFn: async () => {
      const res = await fetch(`/api/transports/${id}`);
      if (!res.ok) throw new Error('Failed to fetch transport');
      return res.json();
    },
    enabled: !!id,
  });
}

// Wallet hooks
export function useWalletBalance(walletId?: string) {
  return useQuery({
    queryKey: queryKeys.wallet.balance,
    queryFn: async () => {
      if (!walletId) return { balance: 0, currency: 'EUR' };
      const res = await fetch(`/api/wallet?walletId=${walletId}`);
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
    enabled: !!walletId,
  });
}

export function useWalletTransactions(walletId?: string, limit = 20) {
  return useQuery({
    queryKey: [...queryKeys.wallet.transactions, walletId, limit],
    queryFn: async () => {
      if (!walletId) return { transactions: [] };
      const res = await fetch(`/api/wallet/transactions?walletId=${walletId}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!walletId,
  });
}
