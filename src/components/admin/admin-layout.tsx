'use client';

/**
 * CargoBit Admin Layout
 * 
 * Main layout component for the admin panel with sidebar navigation.
 * 
 * Structure:
 * - Sidebar: Navigation with role-based visibility
 * - TopBar: User info, notifications, logout
 * - Main Content: Children pages
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminRole } from '@prisma/client';

// ============================================
// TYPES
// ============================================

interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  is2faEnabled: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  roles: AdminRole[]; // Roles that can see this item
  children?: NavItem[];
}

// ============================================
// NAVIGATION ITEMS
// ============================================

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    href: '/admin/dashboard',
    roles: ['ADMIN', 'FINANCE', 'SUPPORT'],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    href: '/admin/payments',
    roles: ['ADMIN', 'FINANCE'],
  },
  {
    id: 'disputes',
    label: 'Disputes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    href: '/admin/disputes',
    roles: ['ADMIN', 'SUPPORT'],
  },
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    href: '/admin/users',
    roles: ['ADMIN', 'SUPPORT'],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    href: '/admin/jobs',
    roles: ['ADMIN', 'SUPPORT'],
  },
  {
    id: 'system',
    label: 'System',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: '/admin/system',
    roles: ['ADMIN'],
    children: [
      { id: 'logs', label: 'Logs', icon: <span className="w-2 h-2" />, href: '/admin/system/logs', roles: ['ADMIN'] },
      { id: 'audit', label: 'Audit Trail', icon: <span className="w-2 h-2" />, href: '/admin/system/audit', roles: ['ADMIN'] },
      { id: 'settings', label: 'Settings', icon: <span className="w-2 h-2" />, href: '/admin/system/settings', roles: ['ADMIN'] },
    ],
  },
];

// ============================================
// ROLE HELPER
// ============================================

function canAccess(roles: AdminRole[], userRole: AdminRole): boolean {
  return roles.includes(userRole);
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

function Sidebar({ user, collapsed, onToggle }: { 
  user: AdminUser; 
  collapsed: boolean; 
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <aside className={`
      fixed left-0 top-0 h-full bg-gray-900 text-white transition-all duration-300 z-40
      ${collapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!collapsed && (
          <Link href="/admin/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
              CB
            </div>
            <span className="font-semibold text-lg">CargoBit</span>
          </Link>
        )}
        <button 
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {NAV_ITEMS.filter(item => canAccess(item.roles, user.role)).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.id);

          return (
            <div key={item.id}>
              <Link
                href={hasChildren ? '#' : item.href}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    if (!collapsed) toggleExpand(item.id);
                  }
                }}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                `}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {hasChildren && (
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </>
                )}
              </Link>

              {/* Children */}
              {!collapsed && hasChildren && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children!.filter(child => canAccess(child.roles, user.role)).map((child) => {
                    const childIsActive = pathname === child.href;
                    return (
                      <Link
                        key={child.id}
                        href={child.href}
                        className={`
                          flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm
                          ${childIsActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                        `}
                      >
                        <span className="w-5" /> {/* Indent */}
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mx-auto">
            {user.email.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </aside>
  );
}

// ============================================
// TOP BAR COMPONENT
// ============================================

function TopBar({ user }: { user: AdminUser }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      {/* Left: Page Title (will be set by individual pages) */}
      <div />

      {/* Right: Actions */}
      <div className="flex items-center space-x-4">
        {/* Role Badge */}
        <span className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''}
          ${user.role === 'FINANCE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
          ${user.role === 'SUPPORT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
        `}>
          {user.role}
        </span>

        {/* 2FA Status */}
        {user.is2faEnabled && (
          <span className="text-green-600 dark:text-green-400" title="2FA Enabled">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Logout"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ============================================
// MAIN LAYOUT COMPONENT
// ============================================

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  // Fetch current admin user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/admin/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.admin);
        } else {
          // Not authenticated, redirect to login
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Failed to fetch admin user:', error);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content */}
      <div className={`
        transition-all duration-300
        ${sidebarCollapsed ? 'ml-16' : 'ml-64'}
      `}>
        <TopBar user={user} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
