import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Transport {
  id: string;
  shipperId: string;
  carrierId?: string;
  status: 'CREATED' | 'PUBLISHED' | 'ASSIGNED' | 'IN_TRANSIT' | 'PICKUP_DONE' | 'DELIVERY_DONE' | 'COMPLETED' | 'CANCELLED';
  origin: string;
  destination: string;
  valueEur: number;
  weightKg?: number;
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  pickupDate: string;
  deliveryDate?: string;
  transportType: string;
  createdAt: string;
}

interface TransportFilters {
  status?: string;
  riskLevel?: string;
  transportType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface TransportState {
  transports: Transport[];
  selectedTransport: Transport | null;
  filters: TransportFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTransports: (transports: Transport[]) => void;
  addTransport: (transport: Transport) => void;
  updateTransport: (id: string, data: Partial<Transport>) => void;
  removeTransport: (id: string) => void;
  selectTransport: (transport: Transport | null) => void;
  setFilters: (filters: Partial<TransportFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTransportStore = create<TransportState>()(
  persist(
    (set, get) => ({
      transports: [],
      selectedTransport: null,
      filters: {},
      isLoading: false,
      error: null,

      setTransports: (transports) => set({ transports }),

      addTransport: (transport) =>
        set((state) => ({
          transports: [transport, ...state.transports],
        })),

      updateTransport: (id, data) =>
        set((state) => ({
          transports: state.transports.map((t) =>
            t.id === id ? { ...t, ...data } : t
          ),
          selectedTransport:
            state.selectedTransport?.id === id
              ? { ...state.selectedTransport, ...data }
              : state.selectedTransport,
        })),

      removeTransport: (id) =>
        set((state) => ({
          transports: state.transports.filter((t) => t.id !== id),
          selectedTransport:
            state.selectedTransport?.id === id ? null : state.selectedTransport,
        })),

      selectTransport: (transport) => set({ selectedTransport: transport }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      clearFilters: () => set({ filters: {} }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),
    }),
    {
      name: 'cargobit-transports',
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);
