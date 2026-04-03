import { create } from 'zustand';
import type { UserRole, NavigationTab, Language } from '@/types';

interface CargoBitState {
  // Auth & Role
  currentRole: UserRole | null;
  isAuthenticated: boolean;
  setRole: (role: UserRole) => void;
  logout: () => void;

  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;

  // Theme & Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Notifications
  notificationCount: number;
  setNotificationCount: (count: number) => void;

  // Selected Shipment (for detail view)
  selectedShipmentId: string | null;
  setSelectedShipmentId: (id: string | null) => void;

  // Selected Ticket (for detail view)
  selectedTicketId: string | null;
  setSelectedTicketId: (id: string | null) => void;

  // Blog article view
  selectedArticleId: string | null;
  setSelectedArticleId: (id: string | null) => void;

  // Create shipment dialog
  showCreateShipment: boolean;
  setShowCreateShipment: (show: boolean) => void;

  // Create ticket dialog
  showCreateTicket: boolean;
  setShowCreateTicket: (show: boolean) => void;

  // Create campaign dialog
  showCreateCampaign: boolean;
  setShowCreateCampaign: (show: boolean) => void;

  // Ad application dialog
  showAdApplication: boolean;
  setShowAdApplication: (show: boolean) => void;
}

export const useCargoBitStore = create<CargoBitState>((set) => ({
  // Auth & Role
  currentRole: null,
  isAuthenticated: false,
  setRole: (role) => set({ currentRole: role, isAuthenticated: true, activeTab: 'dashboard' }),
  logout: () => set({ currentRole: null, isAuthenticated: false, activeTab: 'dashboard', selectedShipmentId: null, selectedTicketId: null, selectedArticleId: null }),

  // Navigation
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab, selectedShipmentId: null, selectedTicketId: null, selectedArticleId: null }),

  // Theme & Language
  language: 'de',
  setLanguage: (lang) => set({ language: lang }),

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Notifications
  notificationCount: 7,
  setNotificationCount: (count) => set({ notificationCount: count }),

  // Selected Shipment
  selectedShipmentId: null,
  setSelectedShipmentId: (id) => set({ selectedShipmentId: id }),

  // Selected Ticket
  selectedTicketId: null,
  setSelectedTicketId: (id) => set({ selectedTicketId: id }),

  // Blog article view
  selectedArticleId: null,
  setSelectedArticleId: (id) => set({ selectedArticleId: id }),

  // Create shipment
  showCreateShipment: false,
  setShowCreateShipment: (show) => set({ showCreateShipment: show }),

  // Create ticket
  showCreateTicket: false,
  setShowCreateTicket: (show) => set({ showCreateTicket: show }),

  // Create campaign
  showCreateCampaign: false,
  setShowCreateCampaign: (show) => set({ showCreateCampaign: show }),

  // Ad application
  showAdApplication: false,
  setShowAdApplication: (show) => set({ showAdApplication: show }),
}));
