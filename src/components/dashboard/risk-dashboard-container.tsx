'use client';

// ============================================
// CARGOBIT RISK DASHBOARD - MAIN CONTAINER
// Navigation between all 3 screens
// ============================================

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  LayoutDashboard,
  User,
  Settings,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { RiskOverview } from './risk-overview';
import { RiskProfileDetail } from './risk-profile-detail';
import { RulesManagement } from './rules-management';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================
// TYPES
// ============================================

type Screen = 'overview' | 'profile' | 'rules';

interface HighRiskEntity {
  id: string;
  type: 'USER' | 'COMPANY' | 'TRANSACTION';
  name: string;
  score: number;
  level: 'GREEN' | 'YELLOW' | 'RED';
  lastEvent: string;
  triggeredRules: string[];
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

function Sidebar({ 
  activeTab, 
  onTabChange,
  onNavigateToRules 
}: { 
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNavigateToRules: () => void;
}) {
  return (
    <div className="w-64 border-r border-[#E0E6ED] bg-white h-full flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-[#E0E6ED]">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-[#2D8CFF]" />
          <div>
            <div className="font-bold text-[#1F2D3D]">CargoBit</div>
            <div className="text-xs text-[#6B7C93]">Security Center</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Button
          variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${activeTab === 'overview' ? 'bg-[#EAF3FF] text-[#2D8CFF]' : 'text-[#6B7C93]'}`}
          onClick={() => onTabChange('overview')}
        >
          <LayoutDashboard className="h-4 w-4 mr-3" />
          Risk Overview
        </Button>
        <Button
          variant={activeTab === 'rules' ? 'secondary' : 'ghost'}
          className={`w-full justify-start ${activeTab === 'rules' ? 'bg-[#EAF3FF] text-[#2D8CFF]' : 'text-[#6B7C93]'}`}
          onClick={() => {
            onTabChange('rules');
            onNavigateToRules();
          }}
        >
          <Settings className="h-4 w-4 mr-3" />
          Rules Management
        </Button>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-[#E0E6ED]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2D8CFF] flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#1F2D3D] truncate">Admin User</div>
            <div className="text-xs text-[#6B7C93]">ADMIN</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HEADER COMPONENT
// ============================================

function Header() {
  return (
    <header className="h-16 border-b border-[#E0E6ED] bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-[#1F2D3D]">Risk Dashboard</h1>
        <Badge className="bg-[#E8F8F0] text-[#2ECC71] hover:bg-[#E8F8F0]">
          System Healthy
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-[#6B7C93]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#E74C3C] rounded-full" />
        </Button>
      </div>
    </header>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export function RiskDashboardContainer() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('overview');
  const [selectedEntity, setSelectedEntity] = useState<HighRiskEntity | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleEntitySelect = (entity: HighRiskEntity) => {
    setSelectedEntity(entity);
    setCurrentScreen('profile');
  };

  const handleNavigateToRules = () => {
    setCurrentScreen('rules');
    setActiveTab('rules');
  };

  const handleBack = () => {
    setCurrentScreen('overview');
    setSelectedEntity(null);
    setActiveTab('overview');
  };

  return (
    <div className="flex h-screen bg-[#F7F9FB]">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'overview') {
            setCurrentScreen('overview');
          } else if (tab === 'rules') {
            setCurrentScreen('rules');
          }
        }}
        onNavigateToRules={handleNavigateToRules}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-auto p-6">
          {currentScreen === 'overview' && (
            <RiskOverview 
              onEntitySelect={handleEntitySelect}
              onNavigateToRules={handleNavigateToRules}
            />
          )}
          
          {currentScreen === 'profile' && (
            <RiskProfileDetail 
              entityId={selectedEntity?.id}
              onBack={handleBack}
            />
          )}
          
          {currentScreen === 'rules' && (
            <RulesManagement onBack={handleBack} />
          )}
        </main>
      </div>
    </div>
  );
}

export default RiskDashboardContainer;
