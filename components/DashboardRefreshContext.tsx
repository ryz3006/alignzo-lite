'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface DashboardRefreshContextType {
  refreshDashboard: () => void;
  isRefreshing: boolean;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextType | undefined>(undefined);

export function DashboardRefreshProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDashboard = useCallback(() => {
    setIsRefreshing(true);
    // Use a small delay to ensure the refresh state is properly set
    setTimeout(() => {
      setIsRefreshing(false);
    }, 100);
  }, []);

  const value: DashboardRefreshContextType = {
    refreshDashboard,
    isRefreshing,
  };

  return (
    <DashboardRefreshContext.Provider value={value}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}

export function useDashboardRefresh() {
  const context = useContext(DashboardRefreshContext);
  if (context === undefined) {
    // Return a default implementation during build time or when provider is not available
    return {
      refreshDashboard: () => {},
      isRefreshing: false,
    };
  }
  return context;
}
