# TECHNICAL ANALYSIS & DETAILED IMPLEMENTATION GUIDE
## Alignzo Lite Application - Code Quality Deep Dive

---

## **DETAILED CODE ISSUES ANALYSIS**

### **1. MAIN DASHBOARD COMPONENT (app/alignzo/page.tsx)**

#### **Critical Issues Identified:**

**1.1 Monolithic Structure (1300+ lines)**
- **Problem**: Single component handling multiple responsibilities
- **Impact**: Hard to maintain, test, and debug
- **Solution**: Break into focused components

**Current Structure:**
```typescript
// Current: Everything in one component
export default function UserDashboardPage() {
  // State management (15+ useState calls)
  // Data fetching logic (4+ async functions)
  // UI rendering (multiple sections)
  // Event handlers
  // Complex calculations
}
```

**Proposed Structure:**
```typescript
// After refactoring
export default function UserDashboardPage() {
  const { data, loading, refreshData } = useDashboardData();
  const { userShift, loadingShifts } = useShiftInformation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <DashboardHeader user={data.user} />
      <ShiftInformation userShift={userShift} loading={loadingShifts} />
      <DashboardStats stats={data.stats} />
      <TeamAvailability data={data.teamAvailability} />
      <ProjectChart data={data.projectHours} />
      <RecentActivity data={data.recentWorkLogs} />
    </div>
  );
}
```

**1.2 Inefficient State Management**
- **Problem**: Multiple useState calls for related data
- **Impact**: Unnecessary re-renders, complex state updates
- **Solution**: Use useReducer for complex state

**Current Implementation:**
```typescript
// Before: Multiple useState calls
const [dashboardData, setDashboardData] = useState<DashboardData>({...});
const [isLoading, setIsLoading] = useState(true);
const [isLoadingShifts, setIsLoadingShifts] = useState(false);
const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
const [selectedUser, setSelectedUser] = useState<any>(null);
const [darkMode, setDarkMode] = useState(false);
const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);
const [selectedShift, setSelectedShift] = useState<{...} | null>(null);
const [shiftUsers, setShiftUsers] = useState<any[]>([]);
const [loadingShiftUsers, setLoadingShiftUsers] = useState(false);
const [greetingLoaded, setGreetingLoaded] = useState(false);
```

**Improved Implementation:**
```typescript
// After: Centralized state management
interface DashboardState {
  data: DashboardData;
  loading: {
    main: boolean;
    shifts: boolean;
    shiftUsers: boolean;
  };
  ui: {
    showUserDetailsModal: boolean;
    showShiftDetailsModal: boolean;
    darkMode: boolean;
    greetingLoaded: boolean;
  };
  selected: {
    user: User | null;
    shift: ShiftSelection | null;
    shiftUsers: User[];
  };
}

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    case 'SET_DATA':
      return { ...state, data: action.payload };
    case 'TOGGLE_MODAL':
      return {
        ...state,
        ui: { ...state.ui, [action.payload]: !state.ui[action.payload] }
      };
    // ... other cases
  }
};

const [state, dispatch] = useReducer(dashboardReducer, initialState);
```

**1.3 Inefficient Data Fetching**
- **Problem**: Multiple API calls without proper caching
- **Impact**: Slow loading, unnecessary network requests
- **Solution**: Implement React Query with proper caching

**Current Implementation:**
```typescript
// Before: Manual data fetching with useState
const loadDashboardData = useCallback(async () => {
  try {
    setIsLoading(true);
    const userResult = await loadUser();
    // ... multiple sequential API calls
    const [workLogsResult, shiftsResult, teamsResult] = await Promise.allSettled([
      loadWorkLogs(),
      loadShiftInformation(),
      loadTeamAvailability()
    ]);
    // ... complex result handling
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  } finally {
    setIsLoading(false);
  }
}, []);
```

**Improved Implementation:**
```typescript
// After: React Query with proper caching
const useDashboardData = () => {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: workLogs, isLoading: workLogsLoading } = useQuery({
    queryKey: ['work-logs', user?.email],
    queryFn: () => loadWorkLogs(user?.email),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', user?.email],
    queryFn: () => loadShiftInformation(user?.email),
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: loadTeamAvailability,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    data: { user, workLogs, shifts, teams },
    loading: { workLogs: workLogsLoading, shifts: shiftsLoading, teams: teamsLoading },
    refetch: () => {
      // Refetch all queries
    }
  };
};
```

### **2. COMPONENT ARCHITECTURE ISSUES**

#### **2.1 Missing Component Separation**

**Current: Mixed concerns in single component**
```typescript
// Current: Everything mixed together
return (
  <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
    {/* Header with Welcome and Controls */}
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
      {/* 50+ lines of header JSX */}
    </div>

    {/* Shift Information Cards */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* 100+ lines of shift cards JSX */}
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* 80+ lines of KPI cards JSX */}
    </div>

    {/* Team Availability and Project Chart */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* 200+ lines of team and chart JSX */}
    </div>

    {/* Recent Activity */}
    <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6">
      {/* 100+ lines of activity JSX */}
    </div>

    {/* Modals */}
    {/* 200+ lines of modal JSX */}
  </div>
);
```

**Proposed: Separated, focused components**
```typescript
// After: Clean, focused components
return (
  <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
    <DashboardHeader user={user} />
    <ShiftInformation userShift={userShift} loading={loadingShifts} />
    <DashboardStats stats={stats} />
    <TeamAvailability data={teamAvailability} onShowShiftDetails={showShiftDetails} />
    <ProjectChart data={projectHours} />
    <RecentActivity data={recentWorkLogs} />
    
    {/* Modals as separate components */}
    <UserDetailsModal 
      isOpen={showUserDetailsModal}
      user={selectedUser}
      onClose={() => setShowUserDetailsModal(false)}
    />
    <ShiftDetailsModal 
      isOpen={showShiftDetailsModal}
      shift={selectedShift}
      users={shiftUsers}
      onClose={() => setShowShiftDetailsModal(false)}
    />
  </div>
);
```

#### **2.2 Component Implementation Examples**

**DashboardHeader Component:**
```typescript
// components/dashboard/DashboardHeader.tsx
interface DashboardHeaderProps {
  user: User | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user }) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-medium">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
              Hey, {user?.full_name || user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-neutral-600 dark:text-neutral-400 mt-1">
              Here's your work summary and shift information for today.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**StatCard Component:**
```typescript
// components/dashboard/StatCard.tsx
interface StatCardProps {
  stat: {
    title: string;
    value: string;
    icon: LucideIcon;
    gradient: string;
    description: string;
    trend: 'up' | 'down' | 'stable';
    trendValue: string;
    trendColor: string;
  };
  index: number;
}

export const StatCard: React.FC<StatCardCardProps> = React.memo(({ stat, index }) => {
  return (
    <div 
      className="group relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-medium group-hover:scale-110 transition-transform duration-300`}>
            <stat.icon className="h-6 w-6 text-white" />
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">
              {stat.value}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">{stat.title}</p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">{stat.description}</p>
        <TrendIndicator trend={stat.trend} value={stat.trendValue} color={stat.trendColor} />
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
```

### **3. CUSTOM HOOKS IMPLEMENTATION**

#### **3.1 useDashboardData Hook**

```typescript
// hooks/useDashboardData.ts
import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';

interface DashboardData {
  user: User | null;
  stats: DashboardStats;
  projectHours: ProjectHours[];
  recentWorkLogs: WorkLogWithProject[];
  userShift: UserShift | null;
  teamAvailability: TeamAvailability[];
}

interface DashboardState {
  data: DashboardData;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardData = {
  user: null,
  stats: { todayHours: 0, weekHours: 0, monthHours: 0, yearHours: 0, totalHours: 0 },
  projectHours: [],
  recentWorkLogs: [],
  userShift: null,
  teamAvailability: []
};

export const useDashboardData = () => {
  const [state, setState] = useState<DashboardState>({
    data: initialState,
    loading: true,
    error: null
  });

  // User data query
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
    retry: 3,
  });

  // Work logs query
  const { data: workLogsData, isLoading: workLogsLoading } = useQuery({
    queryKey: ['work-logs', user?.email],
    queryFn: () => loadWorkLogs(user?.email),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  // Shifts query
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', user?.email],
    queryFn: () => loadShiftInformation(user?.email),
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    retry: 3,
  });

  // Teams query
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: loadTeamAvailability,
    staleTime: 15 * 60 * 1000,
    retry: 3,
  });

  // Combine data when all queries complete
  useEffect(() => {
    if (user && workLogsData && shiftsData && teamsData) {
      const combinedData: DashboardData = {
        user,
        ...workLogsData,
        userShift: shiftsData,
        teamAvailability: teamsData
      };

      setState(prev => ({
        ...prev,
        data: combinedData,
        loading: false,
        error: null
      }));
    }
  }, [user, workLogsData, shiftsData, teamsData]);

  const isLoading = userLoading || workLogsLoading || shiftsLoading || teamsLoading;

  const refreshData = useCallback(() => {
    // Refetch all queries
    window.location.reload(); // Simple refresh for now
  }, []);

  return {
    data: state.data,
    loading: isLoading,
    error: state.error,
    refreshData
  };
};
```

#### **3.2 useShiftInformation Hook**

```typescript
// hooks/useShiftInformation.ts
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';

interface ShiftInformation {
  todayShift: string;
  tomorrowShift: string;
  todayShiftName: string;
  tomorrowShiftName: string;
  todayShiftColor: string;
  tomorrowShiftColor: string;
  todayShiftTime?: string;
  tomorrowShiftTime?: string;
  todayShiftIcon: any;
  tomorrowShiftIcon: any;
  projectId?: string;
  teamId?: string;
}

export const useShiftInformation = () => {
  const [customEnums, setCustomEnums] = useState<any[]>([]);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 10 * 60 * 1000,
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const shiftsResponse = await supabaseClient.getShiftSchedules({
        filters: { 
          user_email: user.email,
          shift_date_in: [todayStr, tomorrowStr]
        }
      });

      if (shiftsResponse.error) {
        throw new Error(shiftsResponse.error);
      }

      return shiftsResponse.data || [];
    },
    enabled: !!user?.email,
    staleTime: 2 * 60 * 1000,
    retry: 3,
  });

  const { data: customEnumsData } = useQuery({
    queryKey: ['custom-enums', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // Load custom shift enums logic
      // ... implementation details
    },
    enabled: !!user?.email,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const getShiftDisplay = useCallback((shiftType: string) => {
    const shiftInfo = getShiftTypeInfo(shiftType, customEnumsData || []);
    return {
      name: shiftInfo.label,
      color: shiftInfo.color,
      bgColor: shiftInfo.bgColor,
      icon: shiftInfo.icon,
      startTime: shiftInfo.startTime,
      endTime: shiftInfo.endTime
    };
  }, [customEnumsData]);

  const processedShifts = useMemo(() => {
    if (!shifts || shifts.length === 0) {
      return getDefaultShift();
    }

    const todayShift = shifts.find((s: any) => s.shift_date === new Date().toISOString().split('T')[0]);
    const tomorrowShift = shifts.find((s: any) => s.shift_date === new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const todayShiftType = todayShift?.shift_type || 'G';
    const tomorrowShiftType = tomorrowShift?.shift_type || 'G';

    const todayShiftInfo = getShiftDisplay(todayShiftType);
    const tomorrowShiftInfo = getShiftDisplay(tomorrowShiftType);

    return {
      todayShift: todayShiftType,
      tomorrowShift: tomorrowShiftType,
      todayShiftName: todayShiftInfo.name,
      tomorrowShiftName: tomorrowShiftInfo.name,
      todayShiftColor: todayShiftInfo.color,
      tomorrowShiftColor: tomorrowShiftInfo.color,
      todayShiftTime: todayShiftInfo.startTime,
      tomorrowShiftTime: tomorrowShiftInfo.startTime,
      todayShiftIcon: todayShiftInfo.icon,
      tomorrowShiftIcon: tomorrowShiftInfo.icon,
      projectId: todayShift?.project_id,
      teamId: todayShift?.team_id
    };
  }, [shifts, getShiftDisplay]);

  return {
    userShift: processedShifts,
    loading: shiftsLoading,
    refreshShifts: () => {
      // Refetch shifts
    }
  };
};
```

### **4. ERROR HANDLING IMPROVEMENTS**

#### **4.1 Centralized Error Handling**

```typescript
// lib/error-handling.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
  }
}

export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500);
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
};

export const createErrorBoundary = (error: AppError) => {
  // Log error to monitoring service
  console.error('Application Error:', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Return user-friendly error message
  return {
    title: 'Something went wrong',
    message: error.message,
    code: error.code,
    action: error.statusCode === 401 ? 'Please log in again' : 'Please try again'
  };
};
```

#### **4.2 Error Boundary Component**

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createErrorBoundary } from '@/lib/error-handling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorInfo = createErrorBoundary(new AppError(
        this.state.error?.message || 'An error occurred',
        'BOUNDARY_ERROR'
      ));

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                {errorInfo.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                {errorInfo.message}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### **5. PERFORMANCE OPTIMIZATIONS**

#### **5.1 React.memo Implementation**

```typescript
// components/dashboard/StatCard.tsx
export const StatCard: React.FC<StatCardProps> = React.memo(({ stat, index }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.stat.value === nextProps.stat.value &&
    prevProps.stat.trend === nextProps.stat.trend &&
    prevProps.stat.trendValue === nextProps.stat.trendValue &&
    prevProps.index === nextProps.index
  );
});
```

#### **5.2 useMemo for Expensive Calculations**

```typescript
// hooks/useDashboardStats.ts
export const useDashboardStats = (workLogs: WorkLog[]) => {
  const stats = useMemo(() => {
    if (!workLogs || workLogs.length === 0) {
      return {
        todayHours: 0,
        weekHours: 0,
        monthHours: 0,
        yearHours: 0,
        totalHours: 0
      };
    }

    const todayRange = getTodayRange();
    const weekRange = getWeekRange();
    const monthRange = getMonthRange();
    const yearStart = new Date(new Date().getFullYear(), 0, 1);

    return {
      todayHours: calculateHoursInRange(workLogs, todayRange.start, todayRange.end),
      weekHours: calculateHoursInRange(workLogs, weekRange.start, weekRange.end),
      monthHours: calculateHoursInRange(workLogs, monthRange.start, monthRange.end),
      yearHours: calculateHoursInRange(workLogs, yearStart, new Date()),
      totalHours: workLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600
    };
  }, [workLogs]);

  const projectHours = useMemo(() => {
    if (!workLogs || workLogs.length === 0) return [];

    const projectMap = new Map<string, number>();
    workLogs.forEach((log) => {
      const projectName = log.project?.name || 'Unknown Project';
      const hours = (log.logged_duration_seconds || 0) / 3600;
      projectMap.set(projectName, (projectMap.get(projectName) || 0) + hours);
    });

    return Array.from(projectMap.entries())
      .map(([name, hours], index) => ({
        projectName: name,
        hours: Math.round(hours * 100) / 100,
        color: PROJECT_COLORS[index % PROJECT_COLORS.length]
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }, [workLogs]);

  return { stats, projectHours };
};
```

---

## **IMPLEMENTATION ROADMAP**

### **Week 1: Foundation**
- [ ] Set up new file structure
- [ ] Create base component templates
- [ ] Implement basic custom hooks

### **Week 2: Component Extraction**
- [ ] Extract DashboardHeader component
- [ ] Extract StatCard component
- [ ] Extract ShiftInformation component

### **Week 3: Data Layer**
- [ ] Implement React Query setup
- [ ] Create useDashboardData hook
- [ ] Create useShiftInformation hook

### **Week 4: State Management**
- [ ] Implement useReducer for complex state
- [ ] Add error boundaries
- [ ] Implement loading states

### **Week 5: Testing Setup**
- [ ] Configure Jest and React Testing Library
- [ ] Write unit tests for utilities
- [ ] Add component tests

### **Week 6: Performance**
- [ ] Add React.memo to components
- [ ] Implement useMemo optimizations
- [ ] Add bundle analysis

---

This detailed technical analysis provides the foundation for implementing the improvements outlined in the main plan. Each section includes specific code examples and implementation details to guide the refactoring process.
