'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { SidebarNav, HeaderBar } from './sidebar-nav';
import { LoginScreen } from './login-screen';
import { DashboardPage } from './dashboard/dashboard-page';
import { ShipmentsPage } from './shipments/shipments-page';
import { TrackingPage } from './tracking/tracking-page';
import { FleetPage } from './fleet/fleet-page';
import { CapacityPage } from './capacity/capacity-page';
import { SupportPage } from './support/support-page';
import { AnalyticsPage } from './analytics/analytics-page';
import { BlogPage } from './blog/blog-page';
import { SettingsPage } from './settings/settings-page';
import { WalletPage } from './wallet/wallet-page';
import { AdvertisingPage } from './advertising/advertising-page';
import { MembershipsPage } from './memberships/memberships-page';
import { TransportChatPage } from './chat/transport-chat-page';
import { AGBPage } from './legal/agb-page';
import { ECMRPage } from './legal/ecmr-page';
import { CookieSettingsPage } from './legal/cookie-settings-page';
import { DeliveryConfirmationPage } from './delivery/delivery-confirmation-page';
import { UsersAdminPage } from './admin/users-admin-page';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export function AppShell() {
  const { isAuthenticated, activeTab, sidebarOpen, setSidebarOpen } = useCargoBitStore();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'shipments':
        return <ShipmentsPage />;
      case 'tracking':
        return <TrackingPage />;
      case 'fleet':
        return <FleetPage />;
      case 'capacity':
        return <CapacityPage />;
      case 'wallet':
        return <WalletPage />;
      case 'advertising':
        return <AdvertisingPage />;
      case 'memberships':
        return <MembershipsPage />;
      case 'support':
        return <SupportPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'blog':
        return <BlogPage />;
      case 'settings':
        return <SettingsPage />;
      case 'chat':
        return <TransportChatPage />;
      case 'agb':
        return <AGBPage />;
      case 'ecmr':
        return <ECMRPage />;
      case 'cookies':
        return <CookieSettingsPage />;
      case 'delivery-confirmation':
        return <DeliveryConfirmationPage />;
      case 'admin':
        return <UsersAdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - fixed on mobile, sticky on desktop */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto ${!sidebarOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'} transition-transform duration-300 ease-in-out`}>
        <SidebarNav />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <HeaderBar />
        <main className="flex-1 overflow-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
