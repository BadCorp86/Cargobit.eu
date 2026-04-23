import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: Record<string, unknown>;
}

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  
  // Modals
  activeModal: ModalState;
  
  // Toasts
  toasts: Toast[];
  
  // Loading states
  globalLoading: boolean;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      activeModal: { isOpen: false, type: null },
      toasts: [],
      globalLoading: false,

      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            root.classList.add(systemTheme);
          } else {
            root.classList.add(theme);
          }
        }
      },

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setSidebarMobileOpen: (open) =>
        set({ sidebarMobileOpen: open }),

      openModal: (type, data) =>
        set({
          activeModal: { isOpen: true, type, data },
        }),

      closeModal: () =>
        set({
          activeModal: { isOpen: false, type: null },
        }),

      addToast: (toast) => {
        const id = Date.now().toString();
        const newToast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto remove after duration
        const duration = toast.duration ?? 5000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      setGlobalLoading: (loading) => set({ globalLoading: loading }),
    }),
    {
      name: 'cargobit-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// Convenience hook for toast notifications
export const useToast = () => {
  const { addToast, removeToast, clearToasts } = useUIStore();
  
  return {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
    remove: removeToast,
    clear: clearToasts,
  };
};
