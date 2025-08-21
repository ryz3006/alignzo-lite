'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  ComposedChart
} from 'recharts';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Users,
  CheckCircle,
  Download,
  Image,
  HelpCircle,
  Activity,
  Target,
  Zap,
  FileText,
  Globe,
  Building,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

interface RemedyMetrics {
  // Incident Volume & Trends
  totalIncidents: number;
  incidentsByPriority: Array<{ priority: string; count: number }>;
  incidentTrendOverTime: Array<{ date: string; count: number }>;
  incidentsByReportedSource: Array<{ source: string; count: number }>;
  incidentTrendByPriority: Array<{ month: string; priority: string; count: number }>;
  stackedBarData: any[];
  
  // Performance & Efficiency
  meanTimeToRespond: number; // in minutes
  meanTimeToResolve: number; // in minutes
  firstCallResolutionRate: number; // percentage
  incidentReopenRate: number; // percentage
  
  // Team & Group Performance
  incidentsPerAssignee: Array<{ assignee: string; count: number }>;
  averageResolutionTimeByGroup: Array<{ group: string; avgTime: number }>;
  assigneePerformanceMetrics: Array<{ 
    assignee: string; 
    avgMTTR: number; 
    maxMTTR: number; 
    avgMTTI: number; 
    maxMTTI: number; 
    avgResolutionTime: number; 
    maxResolutionTime: number; 
    totalTickets: number 
  }>;
  assigneeMTTRHeatmap: Array<{ assignee: string; avgMTTR: number }>;
  incidentsByPriorityAndStatus: Array<{ priority: string; status: string; count: number }>;
  topMTTRIncidents: Array<{ incidentId: string; priority: string; assignee: string; timeTaken: number }>;
  resolutionTimeBuckets: Array<{ 
    monthYear: string; 
    assignee: string; 
    priority: string; 
    lessThan1Hour: number; 
    oneToTwoHours: number; 
    twoToFourHours: number; 
    fourToEightHours: number; 
    eightToTwelveHours: number; 
    twelveToTwentyFourHours: number; 
    moreThan24Hours: number; 
  }>;
  
  // Categorization & Product Analysis
  incidentsByOperationalCategory: Array<{ category: string; count: number }>;
  incidentsByProductCategorization: Array<{ category: string; count: number }>;
  operationalCategoryMonthlyTrends: any[];
  productCategorizationMonthlyTrends: any[];
  
  // User & Customer Impact
  incidentsByDepartment: Array<{ department: string; count: number }>;
  incidentsByImpact: Array<{ impact: string; count: number }>;
  
  // Additional Enhanced Metrics
  slaComplianceRate: number;
  averageResolutionTimeByPriority: Array<{ priority: string; avgTime: number }>;
}

interface RemedyDashboardTabProps {
  filters: {
    dateRange: {
      start: string;
      end: string;
    };
    selectedTeams: string[];
    selectedProjects: string[];
    selectedUsers: string[];
  };
  chartRefs: React.MutableRefObject<{ [key: string]: any }>;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#FF6B6B', '#4ECDC4'];

export default function RemedyDashboardTab({ filters, chartRefs, downloadChartAsImage }: RemedyDashboardTabProps) {
  const [metrics, setMetrics] = useState<RemedyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Handle tooltip toggle
  const toggleTooltip = (tooltipId: string) => {
    setActiveTooltip(activeTooltip === tooltipId ? null : tooltipId);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeTooltip && !(event.target as Element).closest('.tooltip-container')) {
        setActiveTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTooltip]);

  // Helper function to convert minutes to HH:MM:SS format
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '00:00:00';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    loadRemedyData();
  }, [filters]);

  const exportData = async () => {
    if (!metrics) return;
    
    try {
      setExporting(true);
      
      // Create CSV data
      const csvData = [
        ['Metric', 'Value'],
        ['Total Incidents', metrics.totalIncidents],
        ['Average MTTR (minutes)', Math.round(metrics.meanTimeToResolve)],
        ['Average MTTI (minutes)', Math.round(metrics.meanTimeToRespond)],
        ['First Call Resolution Rate (%)', metrics.firstCallResolutionRate.toFixed(1)],
        ['Incident Reopen Rate (%)', metrics.incidentReopenRate.toFixed(1)],
        ['', ''],
        ['Incidents by Priority', ''],
        ...metrics.incidentsByPriority.map(item => [item.priority, item.count]),
        ['', ''],
        ['Incident Trend by Priority', ''],
        ...metrics.incidentTrendByPriority.slice(0, 20).map(item => [`${item.month} - ${item.priority}`, item.count]),
        ['', ''],
        ['Top Assignees', ''],
        ...metrics.incidentsPerAssignee.slice(0, 10).map(item => [item.assignee, item.count]),
        ['', ''],
        ['Assignee Performance Metrics', ''],
        ['Assignee', 'Avg MTTR', 'Max MTTR', 'Avg MTTI', 'Max MTTI', 'Avg Resolution', 'Max Resolution', 'Total Tickets'],
        ...metrics.assigneePerformanceMetrics.map(item => [
          item.assignee,
          formatTime(item.avgMTTR),
          formatTime(item.maxMTTR),
          formatTime(item.avgMTTI),
          formatTime(item.maxMTTI),
          formatTime(item.avgResolutionTime),
          formatTime(item.maxResolutionTime),
          item.totalTickets
        ]),
        ['', ''],
        ['Top 5 Max MTTR Incidents', ''],
        ['Incident ID', 'Priority', 'Assignee', 'Time Taken'],
        ...metrics.topMTTRIncidents.map(item => [
          item.incidentId,
          item.priority,
          item.assignee,
          formatTime(item.timeTaken)
        ]),
        ['', ''],
        ['Resolution Time Buckets', ''],
        ['Month/Year', 'Assignee', 'Priority', '< 1 Hour', '1-2 Hours', '2-4 Hours', '4-8 Hours', '8-12 Hours', '12-24 Hours', '> 24 Hours'],
        ...metrics.resolutionTimeBuckets.map(item => [
          item.monthYear,
          item.assignee,
          item.priority,
          item.lessThan1Hour,
          item.oneToTwoHours,
          item.twoToFourHours,
          item.fourToEightHours,
          item.eightToTwelveHours,
          item.twelveToTwentyFourHours,
          item.moreThan24Hours
        ])
      ];

      // Convert to CSV string
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remedy-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const exportSectionData = async (sectionName: string, data: any[], headers: string[]) => {
    try {
      const csvData = [headers, ...data];
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sectionName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${sectionName} data exported successfully!`);
    } catch (error) {
      console.error('Error exporting section data:', error);
      toast.error('Failed to export section data');
    }
  };

  const calculateRemedyMetrics = (tickets: any[]): RemedyMetrics => {
    // Helper function to convert time string to minutes
    const timeStringToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60;
      }
      return 0;
    };

    // Helper function to calculate time difference in minutes
    const calculateTimeDiff = (startDate: string, endDate: string): number => {
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      return (end.getTime() - start.getTime()) / (1000 * 60); // Convert to minutes
    };

    // 1. Incident Volume & Trends
    const totalIncidents = tickets.length;
    
    const incidentsByPriority = Object.entries(
      tickets.reduce((acc, ticket) => {
        const priority = ticket.priority || 'Unknown';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([priority, count]) => ({ priority, count: count as number }));

    const incidentTrendOverTime = Object.entries(
      tickets.reduce((acc, ticket) => {
        const date = ticket.reported_date1 ? new Date(ticket.reported_date1).toISOString().split('T')[0] : 'Unknown';
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([date, count]) => ({ date, count: count as number })).sort((a, b) => a.date.localeCompare(b.date));

        // Incident Trend by Priority (for stacked bar chart) - Group by month
    const incidentTrendByPriority = tickets.reduce((acc, ticket) => {
      const date = ticket.reported_date1 ? new Date(ticket.reported_date1) : null;
      if (date) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthDisplay = `${new Date(date.getFullYear(), date.getMonth()).toLocaleString('default', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`;
        const priority = ticket.priority || 'Unknown';
        
        const existingEntry = acc.find((item: { month: string; priority: string; count: number }) => item.month === monthDisplay && item.priority === priority);
        if (existingEntry) {
          existingEntry.count++;
        } else {
          acc.push({ month: monthDisplay, priority, count: 1 });
        }
      }
      return acc;
    }, [] as Array<{ month: string; priority: string; count: number }>);

    // Group by month for stacked bar chart
    const groupedByMonth = incidentTrendByPriority.reduce((acc: Record<string, Record<string, number>>, item: { month: string; priority: string; count: number }) => {
      if (!acc[item.month]) {
        acc[item.month] = {};
      }
      acc[item.month][item.priority] = item.count;
      return acc;
    }, {});

    // Convert to format suitable for stacked bar chart
    const stackedBarData = Object.entries(groupedByMonth).map(([month, priorities]) => {
      const result: any = { month };
      Object.entries(priorities as Record<string, number>).forEach(([priority, count]) => {
        result[priority] = count;
      });
      return result;
    }).sort((a, b) => {
      const monthA = new Date(a.month.split('-')[0] + ' 1, 20' + a.month.split('-')[1]);
      const monthB = new Date(b.month.split('-')[0] + ' 1, 20' + b.month.split('-')[1]);
      return monthA.getTime() - monthB.getTime();
    });

    const incidentsByReportedSource = Object.entries(
      tickets.reduce((acc, ticket) => {
        const source = ticket.reported_source || 'Unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([source, count]) => ({ source, count: count as number }));

    // 2. Performance & Efficiency
    const resolvedTickets = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
    
    const meanTimeToRespond = resolvedTickets.length > 0 ? 
      resolvedTickets.reduce((sum, ticket) => {
        return sum + calculateTimeDiff(ticket.reported_date1, ticket.responded_date);
      }, 0) / resolvedTickets.length : 0;

    const meanTimeToResolve = resolvedTickets.length > 0 ? 
      resolvedTickets.reduce((sum, ticket) => {
        return sum + calculateTimeDiff(ticket.reported_date1, ticket.last_resolved_date);
      }, 0) / resolvedTickets.length : 0;

    const firstCallResolutionCount = resolvedTickets.filter(t => 
      (t.group_transfers === '0' || !t.group_transfers) && 
      (t.status === 'Resolved' || t.status === 'Closed')
    ).length;
    const firstCallResolutionRate = resolvedTickets.length > 0 ? 
      (firstCallResolutionCount / resolvedTickets.length) * 100 : 0;

    const reopenedCount = tickets.filter(t => 
      (t.reopen_count && parseInt(t.reopen_count) > 0)
    ).length;
    const incidentReopenRate = resolvedTickets.length > 0 ? 
      (reopenedCount / resolvedTickets.length) * 100 : 0;

    // 3. Team & Group Performance
    const incidentsPerAssignee = Object.entries(
      tickets.reduce((acc, ticket) => {
        const assignee = ticket.assignee || 'Unassigned';
        acc[assignee] = (acc[assignee] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([assignee, count]) => ({ assignee, count: count as number }));

    const averageResolutionTimeByGroup = Object.entries(
      resolvedTickets.reduce((acc, ticket) => {
        const group = ticket.resolver_group || 'Unknown';
        if (!acc[group]) {
          acc[group] = { totalTime: 0, count: 0 };
        }
        acc[group].totalTime += calculateTimeDiff(ticket.reported_date1, ticket.last_resolved_date);
        acc[group].count++;
        return acc;
      }, {} as Record<string, { totalTime: number; count: number }>)
    ).map(([group, data]) => ({
      group,
      avgTime: (data as { totalTime: number; count: number }).count > 0 ? (data as { totalTime: number; count: number }).totalTime / (data as { totalTime: number; count: number }).count : 0
    }));

    // Assignee Performance Metrics
    const assigneePerformanceMetrics = Object.entries(
      tickets.reduce((acc, ticket) => {
        const assignee = ticket.assignee || 'Unassigned';
        if (!acc[assignee]) {
          acc[assignee] = {
            mttrTimes: [],
            mttiTimes: [],
            resolutionTimes: [],
            totalTickets: 0
          };
        }
        
        acc[assignee].totalTickets++;
        
        // Calculate MTTR (Mean Time to Resolve)
        if (ticket.reported_date1 && ticket.last_resolved_date) {
          const resolutionTime = calculateTimeDiff(ticket.reported_date1, ticket.last_resolved_date);
          acc[assignee].resolutionTimes.push(resolutionTime);
        }
        
        // Calculate MTTI (Mean Time to Respond)
        if (ticket.reported_date1 && ticket.responded_date) {
          const responseTime = calculateTimeDiff(ticket.reported_date1, ticket.responded_date);
          acc[assignee].mttiTimes.push(responseTime);
        }
        
        // Calculate MTTR (Mean Time to Resolve) - same as resolution time
        if (ticket.reported_date1 && ticket.last_resolved_date) {
          const resolutionTime = calculateTimeDiff(ticket.reported_date1, ticket.last_resolved_date);
          acc[assignee].mttrTimes.push(resolutionTime);
        }
        
        return acc;
      }, {} as Record<string, { mttrTimes: number[]; mttiTimes: number[]; resolutionTimes: number[]; totalTickets: number }>)
         ).map(([assignee, data]) => {
       const typedData = data as { mttrTimes: number[]; mttiTimes: number[]; resolutionTimes: number[]; totalTickets: number };
       const avgMTTR = typedData.mttrTimes.length > 0 ? typedData.mttrTimes.reduce((a: number, b: number) => a + b, 0) / typedData.mttrTimes.length : 0;
       const maxMTTR = typedData.mttrTimes.length > 0 ? Math.max(...typedData.mttrTimes) : 0;
       const avgMTTI = typedData.mttiTimes.length > 0 ? typedData.mttiTimes.reduce((a: number, b: number) => a + b, 0) / typedData.mttiTimes.length : 0;
       const maxMTTI = typedData.mttiTimes.length > 0 ? Math.max(...typedData.mttiTimes) : 0;
       const avgResolutionTime = typedData.resolutionTimes.length > 0 ? typedData.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / typedData.resolutionTimes.length : 0;
       const maxResolutionTime = typedData.resolutionTimes.length > 0 ? Math.max(...typedData.resolutionTimes) : 0;
      
             return {
         assignee,
         avgMTTR,
         maxMTTR,
         avgMTTI,
         maxMTTI,
         avgResolutionTime,
         maxResolutionTime,
         totalTickets: typedData.totalTickets
       };
    });

    // Assignee MTTR Heatmap data
    const assigneeMTTRHeatmap = assigneePerformanceMetrics.map(assignee => ({
      assignee: assignee.assignee,
      avgMTTR: assignee.avgMTTR
    }));

    // Incidents by Priority and Status
    const incidentsByPriorityAndStatus = Object.entries(
      tickets.reduce((acc, ticket) => {
        const priority = ticket.priority || 'Unknown';
        const status = ticket.status || 'Unknown';
        const key = `${priority}|${status}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([key, count]) => {
      const [priority, status] = key.split('|');
      return { priority, status, count: count as number };
    });

    // Top 5 Incidents with Max MTTR
    const topMTTRIncidents = tickets
      .filter(ticket => ticket.reported_date1 && ticket.last_resolved_date)
      .map(ticket => ({
        incidentId: ticket.incident_id || 'Unknown',
        priority: ticket.priority || 'Unknown',
        assignee: ticket.assignee || 'Unassigned',
        timeTaken: calculateTimeDiff(ticket.reported_date1, ticket.last_resolved_date)
      }))
      .sort((a, b) => b.timeTaken - a.timeTaken)
      .slice(0, 5);

    // Resolution Time Buckets
    const resolutionTimeBuckets = tickets
      .filter(ticket => ticket.reported_date1 && ticket.last_resolved_date)
      .reduce((acc, ticket) => {
        const date = new Date(ticket.reported_date1);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const assignee = ticket.assignee || 'Unassigned';
        const priority = ticket.priority || 'Unknown';
        const resolutionTime = calculateTimeDiff(ticket.reported_date1, ticket.last_resolved_date);
        
        const key = `${monthYear}|${assignee}|${priority}`;
        if (!acc[key]) {
          acc[key] = {
            monthYear,
            assignee,
            priority,
            lessThan1Hour: 0,
            oneToTwoHours: 0,
            twoToFourHours: 0,
            fourToEightHours: 0,
            eightToTwelveHours: 0,
            twelveToTwentyFourHours: 0,
            moreThan24Hours: 0
          };
        }
        
        // Categorize by time buckets (in minutes)
        if (resolutionTime < 60) {
          acc[key].lessThan1Hour++;
        } else if (resolutionTime < 120) {
          acc[key].oneToTwoHours++;
        } else if (resolutionTime < 240) {
          acc[key].twoToFourHours++;
        } else if (resolutionTime < 480) {
          acc[key].fourToEightHours++;
        } else if (resolutionTime < 720) {
          acc[key].eightToTwelveHours++;
        } else if (resolutionTime < 1440) {
          acc[key].twelveToTwentyFourHours++;
        } else {
          acc[key].moreThan24Hours++;
        }
        
        return acc;
      }, {} as Record<string, any>);

    const resolutionTimeBucketsArray = Object.values(resolutionTimeBuckets) as Array<{ 
      monthYear: string; 
      assignee: string; 
      priority: string; 
      lessThan1Hour: number; 
      oneToTwoHours: number; 
      twoToFourHours: number; 
      fourToEightHours: number; 
      eightToTwelveHours: number; 
      twelveToTwentyFourHours: number; 
      moreThan24Hours: number; 
    }>;

    // 4. Categorization & Product Analysis
    const incidentsByOperationalCategory = Object.entries(
      tickets.reduce((acc, ticket) => {
        const category = ticket.operational_category_tier_1 || 'Unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, count]) => ({ category, count: count as number }));

    const incidentsByProductCategorization = Object.entries(
      tickets.reduce((acc, ticket) => {
        const category = ticket.product_categorization_tier_1 || 'Unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, count]) => ({ category, count: count as number }));

    // Monthly trends for Operational Category - Group by category, priority and month
    const operationalCategoryMonthlyTrends = tickets.reduce((acc, ticket) => {
      const date = ticket.reported_date1 ? new Date(ticket.reported_date1) : null;
      if (date) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthDisplay = `${new Date(date.getFullYear(), date.getMonth()).toLocaleString('default', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`;
        const tier1 = ticket.operational_category_tier_1 || 'Unknown';
        const tier2 = ticket.operational_category_tier_2 || 'Unknown';
        const tier3 = ticket.operational_category_tier_3 || 'Unknown';
        const priority = ticket.priority || 'Unknown';
        
        const categoryKey = `${tier1}|${tier2}|${tier3}|${priority}`;
        if (!acc[categoryKey]) {
          acc[categoryKey] = { tier1, tier2, tier3, priority, months: {} };
        }
        if (!acc[categoryKey].months[monthKey]) {
          acc[categoryKey].months[monthKey] = { monthDisplay, count: 0 };
        }
        acc[categoryKey].months[monthKey].count++;
      }
      return acc;
    }, {} as Record<string, { tier1: string; tier2: string; tier3: string; priority: string; months: Record<string, { monthDisplay: string; count: number }> }>);

    // Convert to table format with months as columns
    const operationalCategoryMonthlyTrendsArray = Object.values(operationalCategoryMonthlyTrends).map((category: any) => {
      const result: any = {
        tier1: category.tier1,
        tier2: category.tier2,
        tier3: category.tier3,
        priority: category.priority
      };
      Object.entries(category.months).forEach(([monthKey, data]: [string, any]) => {
        result[data.monthDisplay] = data.count;
      });
      return result;
    });

    // Monthly trends for Product Categorization - Group by category, priority and month
    const productCategorizationMonthlyTrends = tickets.reduce((acc, ticket) => {
      const date = ticket.reported_date1 ? new Date(ticket.reported_date1) : null;
      if (date) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthDisplay = `${new Date(date.getFullYear(), date.getMonth()).toLocaleString('default', { month: 'short' })}-${String(date.getFullYear()).slice(-2)}`;
        const tier1 = ticket.product_categorization_tier_1 || 'Unknown';
        const tier2 = ticket.product_categorization_tier_2 || 'Unknown';
        const tier3 = ticket.product_categorization_tier_3 || 'Unknown';
        const priority = ticket.priority || 'Unknown';
        
        const categoryKey = `${tier1}|${tier2}|${tier3}|${priority}`;
        if (!acc[categoryKey]) {
          acc[categoryKey] = { tier1, tier2, tier3, priority, months: {} };
        }
        if (!acc[categoryKey].months[monthKey]) {
          acc[categoryKey].months[monthKey] = { monthDisplay, count: 0 };
        }
        acc[categoryKey].months[monthKey].count++;
      }
      return acc;
    }, {} as Record<string, { tier1: string; tier2: string; tier3: string; priority: string; months: Record<string, { monthDisplay: string; count: number }> }>);

    // Convert to table format with months as columns
    const productCategorizationMonthlyTrendsArray = Object.values(productCategorizationMonthlyTrends).map((category: any) => {
      const result: any = {
        tier1: category.tier1,
        tier2: category.tier2,
        tier3: category.tier3,
        priority: category.priority
      };
      Object.entries(category.months).forEach(([monthKey, data]: [string, any]) => {
        result[data.monthDisplay] = data.count;
      });
      return result;
    });

    // 5. User & Customer Impact
    const incidentsByDepartment = Object.entries(
      tickets.reduce((acc, ticket) => {
        const department = ticket.department || 'Unknown';
        acc[department] = (acc[department] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([department, count]) => ({ department, count: count as number }));

    const incidentsByImpact = Object.entries(
      tickets.reduce((acc, ticket) => {
        const impact = ticket.impact || 'Unknown';
        acc[impact] = (acc[impact] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([impact, count]) => ({ impact, count: count as number }));

    // Additional metrics for enhanced insights
    const slaComplianceRate = resolvedTickets.length > 0 ? 
      (resolvedTickets.filter(t => {
        const resolutionTime = calculateTimeDiff(t.reported_date1, t.last_resolved_date);
        // Assuming 4-hour SLA for critical, 8-hour for high, 24-hour for medium, 48-hour for low
        const priority = t.priority?.toLowerCase() || 'medium';
        const slaHours = priority === 'critical' ? 4 : priority === 'high' ? 8 : priority === 'medium' ? 24 : 48;
        return resolutionTime <= slaHours * 60; // Convert to minutes
      }).length / resolvedTickets.length) * 100 : 0;

    const averageResolutionTimeByPriority = Object.entries(
      resolvedTickets.reduce((acc, ticket) => {
        const priority = ticket.priority || 'Unknown';
        if (!acc[priority]) {
          acc[priority] = { totalTime: 0, count: 0 };
        }
        acc[priority].totalTime += calculateTimeDiff(ticket.reported_date1, ticket.last_resolved_date);
        acc[priority].count++;
        return acc;
      }, {} as Record<string, { totalTime: number; count: number }>)
    ).map(([priority, data]) => ({
      priority,
      avgTime: (data as { totalTime: number; count: number }).count > 0 ? (data as { totalTime: number; count: number }).totalTime / (data as { totalTime: number; count: number }).count : 0
    }));

    return {
      totalIncidents,
      incidentsByPriority,
      incidentTrendOverTime,
      incidentsByReportedSource,
      incidentTrendByPriority,
      stackedBarData,
      meanTimeToRespond,
      meanTimeToResolve,
      firstCallResolutionRate,
      incidentReopenRate,
      incidentsPerAssignee,
      averageResolutionTimeByGroup,
      assigneePerformanceMetrics,
      assigneeMTTRHeatmap,
      incidentsByPriorityAndStatus,
      topMTTRIncidents,
      resolutionTimeBuckets: resolutionTimeBucketsArray,
      incidentsByOperationalCategory,
      incidentsByProductCategorization,
      operationalCategoryMonthlyTrends: operationalCategoryMonthlyTrendsArray,
      productCategorizationMonthlyTrends: productCategorizationMonthlyTrendsArray,
      incidentsByDepartment,
      incidentsByImpact,
      slaComplianceRate,
      averageResolutionTimeByPriority
    };
  };

  const loadRemedyData = async () => {
    try {
      setLoading(true);
      
      // Build the base query with filters
      let query = supabase
        .from('uploaded_tickets')
        .select('*');

      // Apply date range filter
      if (filters.dateRange.start && filters.dateRange.end) {
        query = query
          .gte('reported_date1', filters.dateRange.start)
          .lte('reported_date1', filters.dateRange.end);
      }

      // Apply project filter if selected
      if (filters.selectedProjects.length > 0) {
        // Get project IDs from project names
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .in('name', filters.selectedProjects);
        
        if (projects && projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          query = query.in('project_id', projectIds);
        }
      }

      // Apply user filter if selected
      if (filters.selectedUsers.length > 0) {
        query = query.in('mapped_user_email', filters.selectedUsers);
      }

      const { data: tickets, error } = await query;
      
      if (error) throw error;

      if (tickets && tickets.length > 0) {
        const calculatedMetrics = calculateRemedyMetrics(tickets);
        setMetrics(calculatedMetrics);
      } else {
        setMetrics(null);
      }
    } catch (error) {
      console.error('Error loading Remedy data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Remedy Data Available</h3>
        <p className="text-gray-600">
          No incident data found for the selected filters. Please upload Remedy ticket data or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Remedy Incident Analytics</h2>
          <p className="text-gray-600">Comprehensive incident management insights and performance metrics</p>
        </div>
        <button
          onClick={exportData}
          disabled={exporting || !metrics}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export Data'}
        </button>
      </div>

             {/* Header Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white rounded-lg shadow p-6 relative tooltip-container">
           <div className="flex items-center">
             <div className="p-2 bg-blue-100 rounded-lg">
               <AlertTriangle className="w-6 h-6 text-blue-600" />
             </div>
             <div className="ml-4">
               <p className="text-sm font-medium text-gray-600">Total Incidents</p>
               <p className="text-2xl font-bold text-gray-900">{metrics.totalIncidents.toLocaleString()}</p>
             </div>
             <button
               onClick={() => toggleTooltip('total-incidents')}
               className="ml-auto p-1 text-gray-400 hover:text-gray-600"
             >
               <HelpCircle className="w-4 h-4" />
             </button>
           </div>
           {activeTooltip === 'total-incidents' && (
             <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
               Total number of incidents reported over the selected time period based on Reported_Date1.
             </div>
           )}
         </div>

         <div className="bg-white rounded-lg shadow p-6 relative tooltip-container">
           <div className="flex items-center">
             <div className="p-2 bg-green-100 rounded-lg">
               <Clock className="w-6 h-6 text-green-600" />
             </div>
             <div className="ml-4">
               <p className="text-sm font-medium text-gray-600">Avg MTTR (min)</p>
               <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.meanTimeToResolve)}</p>
             </div>
             <button
               onClick={() => toggleTooltip('avg-mttr')}
               className="ml-auto p-1 text-gray-400 hover:text-gray-600"
             >
               <HelpCircle className="w-4 h-4" />
             </button>
           </div>
           {activeTooltip === 'avg-mttr' && (
             <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
               Mean Time to Resolve: Average time taken to resolve incidents from Reported_Date1 to Last_Resolved_Date.
             </div>
           )}
         </div>

         <div className="bg-white rounded-lg shadow p-6 relative tooltip-container">
           <div className="flex items-center">
             <div className="p-2 bg-yellow-100 rounded-lg">
               <CheckCircle className="w-6 h-6 text-yellow-600" />
             </div>
             <div className="ml-4">
               <p className="text-sm font-medium text-gray-600">FCR Rate</p>
               <p className="text-2xl font-bold text-gray-900">{metrics.firstCallResolutionRate.toFixed(1)}%</p>
             </div>
             <button
               onClick={() => toggleTooltip('fcr-rate')}
               className="ml-auto p-1 text-gray-400 hover:text-gray-600"
             >
               <HelpCircle className="w-4 h-4" />
             </button>
           </div>
           {activeTooltip === 'fcr-rate' && (
             <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
               First Call Resolution Rate: Percentage of incidents resolved by first assigned group without transfers.
             </div>
           )}
         </div>

         <div className="bg-white rounded-lg shadow p-6 relative tooltip-container">
           <div className="flex items-center">
             <div className="p-2 bg-red-100 rounded-lg">
               <Activity className="w-6 h-6 text-red-600" />
             </div>
             <div className="ml-4">
               <p className="text-sm font-medium text-gray-600">Reopen Rate</p>
               <p className="text-2xl font-bold text-gray-900">{metrics.incidentReopenRate.toFixed(1)}%</p>
             </div>
             <button
               onClick={() => toggleTooltip('reopen-rate')}
               className="ml-auto p-1 text-gray-400 hover:text-gray-600"
             >
               <HelpCircle className="w-4 h-4" />
             </button>
           </div>
           {activeTooltip === 'reopen-rate' && (
             <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
               Incident Reopen Rate: Percentage of incidents that were reopened after being resolved.
             </div>
           )}
         </div>
       </div>

      {/* Incident Volume & Trends Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Incident Volume & Trends
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         {/* Incident Trend Over Time */}
             <div className="bg-gray-50 rounded-lg p-4">
                               <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  Incident Trend Over Time
                  <div className="ml-2 relative tooltip-container">
                    <button
                      onClick={() => toggleTooltip('incident-trend')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {activeTooltip === 'incident-trend' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                        Shows the number of incidents reported each day over the selected time period.
                      </div>
                    )}
                  </div>
                </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.incidentTrendOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0088FE" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

                         {/* Incidents by Priority */}
             <div className="bg-gray-50 rounded-lg p-4">
               <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                 Incidents by Priority
                 <div className="ml-2 relative group">
                   <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                       <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-xs">
                      Distribution of incidents by priority level (SR, S3, etc.). Shows the percentage breakdown of incident criticality.
                    </div>
                 </div>
               </h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                                     <Pie
                     data={metrics.incidentsByPriority}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     label={({ priority, percent }) => `${priority} ${(percent * 100).toFixed(0)}%`}
                     outerRadius={80}
                     fill="#8884d8"
                     dataKey="count"
                     nameKey="priority"
                   >
                    {metrics.incidentsByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                           {/* Incident Trend by Priority (Stacked Bar Chart) */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  Incident Trend by Priority
                  <div className="ml-2 relative group">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-xs">
                      Shows incident trends over time grouped by priority levels. Each priority is represented by a different colored stack.
                    </div>
                  </div>
                </h4>
                                 <ResponsiveContainer width="100%" height={300}>
                   <BarChart data={metrics.stackedBarData}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="month" />
                     <YAxis />
                     <Tooltip />
                     <Legend />
                     {metrics.incidentsByPriority.map((priority, index) => (
                       <Bar key={priority.priority} dataKey={priority.priority} stackId="a" fill={COLORS[index % COLORS.length]} />
                     ))}
                   </BarChart>
                 </ResponsiveContainer>
              </div>

                           {/* Incidents by Reported Source */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  Incidents by Reported Source
                  <div className="ml-2 relative group">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-xs">
                      Shows how incidents are being reported (phone, email, self-service portal, etc.).
                    </div>
                  </div>
                </h4>
               <ResponsiveContainer width="100%" height={300}>
                 <BarChart data={metrics.incidentsByReportedSource}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="source" />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="count" fill="#FFBB28" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>
      </div>

      {/* Performance & Efficiency Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Performance & Efficiency
          </h3>
        </div>
                 <div className="p-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* MTTR vs MTTR Comparison */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  Response vs Resolution Time
                  <div className="ml-2 relative tooltip-container">
                    <button
                      onClick={() => toggleTooltip('response-resolution')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {activeTooltip === 'response-resolution' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                        MTTR: Mean Time to Resolve (Last_Resolved_Date - Reported_Date1). MTTI: Mean Time to Respond (Responded_Date - Reported_Date1).
                      </div>
                    )}
                  </div>
                </h4>
               <ResponsiveContainer width="100%" height={300}>
                 <ComposedChart data={[
                   { metric: 'MTTR', time: metrics.meanTimeToResolve },
                   { metric: 'MTTI', time: metrics.meanTimeToRespond }
                 ]}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="metric" />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="time" fill="#8884D8" />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>

                                        {/* Assignee Performance Metrics Table */}
               <div className="bg-gray-50 rounded-lg p-4">
                                 <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    Assignee Performance Metrics
                    <div className="ml-2 relative tooltip-container">
                      <button
                        onClick={() => toggleTooltip('assignee-metrics')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      {activeTooltip === 'assignee-metrics' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                          MTTR: Mean Time to Resolve (Last_Resolved_Date - Reported_Date1). MTTI: Mean Time to Respond (Responded_Date - Reported_Date1). Resolution Time: Actual time taken for ticket closure.
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => exportSectionData(
                      'Assignee Performance Metrics',
                      metrics.assigneePerformanceMetrics.map(item => [
                        item.assignee,
                        formatTime(item.avgMTTR),
                        formatTime(item.maxMTTR),
                        formatTime(item.avgMTTI),
                        formatTime(item.maxMTTI),
                        formatTime(item.avgResolutionTime),
                        formatTime(item.maxResolutionTime),
                        item.totalTickets
                      ]),
                      ['Assignee', 'Avg MTTR', 'Max MTTR', 'Avg MTTI', 'Max MTTI', 'Avg Resolution', 'Max Resolution', 'Total Tickets']
                    )}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </h4>
                 <div className="overflow-x-auto">
                   <table className="w-full bg-white border border-gray-200">
                     <thead>
                       <tr className="bg-gray-50">
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Assignee</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Avg MTTR</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Max MTTR</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Avg MTTI</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Max MTTI</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Avg Resolution</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Max Resolution</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Total Tickets</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {metrics.assigneePerformanceMetrics.slice(0, 10).map((assignee, index) => (
                         <tr key={index} className="hover:bg-gray-50">
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{assignee.assignee}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{formatTime(assignee.avgMTTR)}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{formatTime(assignee.maxMTTR)}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{formatTime(assignee.avgMTTI)}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{formatTime(assignee.maxMTTI)}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{formatTime(assignee.avgResolutionTime)}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{formatTime(assignee.maxResolutionTime)}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{assignee.totalTickets}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
                               </div>

                {/* Assignee MTTR Heatmap */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                    Assignee MTTR Heatmap
                    <div className="ml-2 relative tooltip-container">
                      <button
                        onClick={() => toggleTooltip('assignee-mttr-heatmap')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      {activeTooltip === 'assignee-mttr-heatmap' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                          Heatmap showing average MTTR (Mean Time to Resolve) for each assignee. Darker colors indicate higher MTTR values.
                        </div>
                      )}
                    </div>
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.assigneeMTTRHeatmap.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="assignee" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [formatTime(value), 'Avg MTTR']}
                        labelFormatter={(label) => `Assignee: ${label}`}
                      />
                      <Bar dataKey="avgMTTR" fill="#8884d8">
                        {metrics.assigneeMTTRHeatmap.slice(0, 15).map((entry, index) => {
                          const maxMTTR = Math.max(...metrics.assigneeMTTRHeatmap.map(item => item.avgMTTR));
                          const intensity = entry.avgMTTR / maxMTTR;
                          const color = `rgba(255, 99, 132, ${0.3 + intensity * 0.7})`;
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Incidents by Priority and Status Table */}
                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    Incidents by Priority and Status
                    <div className="ml-2 relative tooltip-container">
                      <button
                        onClick={() => toggleTooltip('priority-status-table')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      {activeTooltip === 'priority-status-table' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                          Shows the count of incidents grouped by priority and status combination.
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => exportSectionData(
                      'Incidents by Priority and Status',
                      metrics.incidentsByPriorityAndStatus.map(item => [
                        item.priority,
                        item.status,
                        item.count
                      ]),
                      ['Priority', 'Status', 'Count']
                    )}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Priority</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Count</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.incidentsByPriorityAndStatus.slice(0, 15).map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.priority}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.status}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top 5 Max MTTR Incidents Table */}
                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    Top 5 Max MTTR Incidents
                    <div className="ml-2 relative tooltip-container">
                      <button
                        onClick={() => toggleTooltip('top-mttr-incidents')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      {activeTooltip === 'top-mttr-incidents' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                          Shows the top 5 incidents with the highest MTTR (Mean Time to Resolve) values.
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => exportSectionData(
                      'Top 5 Max MTTR Incidents',
                      metrics.topMTTRIncidents.map(item => [
                        item.incidentId,
                        item.priority,
                        item.assignee,
                        formatTime(item.timeTaken)
                      ]),
                      ['Incident ID', 'Priority', 'Assignee', 'Time Taken']
                    )}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Incident ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Priority</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Assignee</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Time Taken</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.topMTTRIncidents.map((incident, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{incident.incidentId}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{incident.priority}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{incident.assignee}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{formatTime(incident.timeTaken)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Resolution Time Buckets Table */}
                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    Resolution Time Buckets
                    <div className="ml-2 relative tooltip-container">
                      <button
                        onClick={() => toggleTooltip('resolution-time-buckets')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      {activeTooltip === 'resolution-time-buckets' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                          Shows the distribution of ticket resolution times across different time buckets for each month, assignee, and priority combination.
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => exportSectionData(
                      'Resolution Time Buckets',
                      metrics.resolutionTimeBuckets.map(item => [
                        item.monthYear,
                        item.assignee,
                        item.priority,
                        item.lessThan1Hour,
                        item.oneToTwoHours,
                        item.twoToFourHours,
                        item.fourToEightHours,
                        item.eightToTwelveHours,
                        item.twelveToTwentyFourHours,
                        item.moreThan24Hours
                      ]),
                      ['Month/Year', 'Assignee', 'Priority', '< 1 Hour', '1-2 Hours', '2-4 Hours', '4-8 Hours', '8-12 Hours', '12-24 Hours', '> 24 Hours']
                    )}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Month/Year</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Assignee</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Priority</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">&lt; 1 Hour</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">1-2 Hours</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">2-4 Hours</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">4-8 Hours</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">8-12 Hours</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">12-24 Hours</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">&gt; 24 Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.resolutionTimeBuckets.slice(0, 15).map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.monthYear}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.assignee}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.priority}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.lessThan1Hour}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.oneToTwoHours}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.twoToFourHours}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.fourToEightHours}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.eightToTwelveHours}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.twelveToTwentyFourHours}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.moreThan24Hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Operational Category Monthly Trends Table */}
                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    Operational Category Monthly Trends
                    <div className="ml-2 relative tooltip-container">
                      <button
                        onClick={() => toggleTooltip('operational-category')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      {activeTooltip === 'operational-category' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                          Shows monthly ticket counts for each operational category tier combination. Months are displayed as columns for better readability.
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const months = new Set<string>();
                      metrics.operationalCategoryMonthlyTrends.forEach((item: any) => {
                        Object.keys(item).forEach(key => {
                          if (key !== 'tier1' && key !== 'tier2' && key !== 'tier3' && key !== 'priority') {
                            months.add(key);
                          }
                        });
                      });
                      const sortedMonths = Array.from(months).sort();
                      const headers = ['Tier 1', 'Tier 2', 'Tier 3', 'Priority', ...sortedMonths];
                      const data = metrics.operationalCategoryMonthlyTrends.map((item: any) => [
                        item.tier1,
                        item.tier2,
                        item.tier3,
                        item.priority,
                        ...sortedMonths.map(month => item[month] || 0)
                      ]);
                      exportSectionData('Operational Category Monthly Trends', data, headers);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tier 1</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tier 2</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tier 3</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Priority</th>
                          {(() => {
                            const months = new Set<string>();
                            metrics.operationalCategoryMonthlyTrends.forEach((item: any) => {
                              Object.keys(item).forEach(key => {
                                if (key !== 'tier1' && key !== 'tier2' && key !== 'tier3' && key !== 'priority') {
                                  months.add(key);
                                }
                              });
                            });
                            return Array.from(months).sort().map(month => (
                              <th key={month} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">{month}</th>
                            ));
                          })()}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.operationalCategoryMonthlyTrends.slice(0, 10).map((item: any, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.tier1}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.tier2}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.tier3}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.priority}</td>
                            {(() => {
                              const months = new Set<string>();
                              metrics.operationalCategoryMonthlyTrends.forEach((item: any) => {
                                Object.keys(item).forEach(key => {
                                  if (key !== 'tier1' && key !== 'tier2' && key !== 'tier3' && key !== 'priority') {
                                    months.add(key);
                                  }
                                });
                              });
                              return Array.from(months).sort().map(month => (
                                <td key={month} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item[month] || 0}</td>
                              ));
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Product Categorization Monthly Trends Table */}
                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    Product Categorization Monthly Trends
                    <div className="ml-2 relative tooltip-container">
                      <button
                        onClick={() => toggleTooltip('product-categorization')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                      {activeTooltip === 'product-categorization' && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                          Shows monthly ticket counts for each product categorization tier combination. Months are displayed as columns for better readability.
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const months = new Set<string>();
                      metrics.productCategorizationMonthlyTrends.forEach((item: any) => {
                        Object.keys(item).forEach(key => {
                          if (key !== 'tier1' && key !== 'tier2' && key !== 'tier3' && key !== 'priority') {
                            months.add(key);
                          }
                        });
                      });
                      const sortedMonths = Array.from(months).sort();
                      const headers = ['Tier 1', 'Tier 2', 'Tier 3', 'Priority', ...sortedMonths];
                      const data = metrics.productCategorizationMonthlyTrends.map((item: any) => [
                        item.tier1,
                        item.tier2,
                        item.tier3,
                        item.priority,
                        ...sortedMonths.map(month => item[month] || 0)
                      ]);
                      exportSectionData('Product Categorization Monthly Trends', data, headers);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </button>
                </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full bg-white border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tier 1</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tier 2</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tier 3</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Priority</th>
                          {(() => {
                            const months = new Set<string>();
                            metrics.productCategorizationMonthlyTrends.forEach((item: any) => {
                              Object.keys(item).forEach(key => {
                                if (key !== 'tier1' && key !== 'tier2' && key !== 'tier3' && key !== 'priority') {
                                  months.add(key);
                                }
                              });
                            });
                            return Array.from(months).sort().map(month => (
                              <th key={month} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">{month}</th>
                            ));
                          })()}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {metrics.productCategorizationMonthlyTrends.slice(0, 10).map((item: any, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.tier1}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.tier2}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.tier3}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item.priority}</td>
                            {(() => {
                              const months = new Set<string>();
                              metrics.productCategorizationMonthlyTrends.forEach((item: any) => {
                                Object.keys(item).forEach(key => {
                                  if (key !== 'tier1' && key !== 'tier2' && key !== 'tier3' && key !== 'priority') {
                                    months.add(key);
                                  }
                                });
                              });
                              return Array.from(months).sort().map(month => (
                                <td key={month} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-b">{item[month] || 0}</td>
                              ));
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          </div>
        </div>

       {/* Team & Group Performance Section */}
       <div className="bg-white rounded-lg shadow">
         <div className="p-6 border-b border-gray-200">
           <h3 className="text-lg font-medium text-gray-900 flex items-center">
             <Users className="w-5 h-5 mr-2" />
             Team & Group Performance
           </h3>
         </div>
         <div className="p-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Incidents per Assignee */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  Incidents per Assignee
                  <div className="ml-2 relative tooltip-container">
                    <button
                      onClick={() => toggleTooltip('incidents-per-assignee')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {activeTooltip === 'incidents-per-assignee' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                        Shows the number of incidents assigned to each support team member or group.
                      </div>
                    )}
                  </div>
                </h4>
               <ResponsiveContainer width="100%" height={300}>
                 <BarChart data={metrics.incidentsPerAssignee.slice(0, 10)}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="assignee" />
                   <YAxis />
                   <Tooltip />
                   <Bar dataKey="count" fill="#FFC658" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
         </div>
       </div>

      {/* Categorization & Product Analysis Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Categorization & Product Analysis
          </h3>
        </div>
                 <div className="p-6">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Incidents by Operational Category */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  Incidents by Operational Category
                  <div className="ml-2 relative tooltip-container">
                    <button
                      onClick={() => toggleTooltip('operational-category-pie')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {activeTooltip === 'operational-category-pie' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg z-10 max-w-xs">
                        Distribution of incidents by operational category (hardware, software, network, etc.) based on Tier 1 categorization.
                      </div>
                    )}
                  </div>
                </h4>
               <ResponsiveContainer width="100%" height={300}>
                 <PieChart>
                                      <Pie
                      data={metrics.incidentsByOperationalCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="category"
                    >
                     {metrics.incidentsByOperationalCategory.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>
         </div>
      </div>

      {/* User & Customer Impact Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Star className="w-5 h-5 mr-2" />
            User & Customer Impact
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                       {/* Additional Performance Metrics */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  Performance Summary
                  <div className="ml-2 relative group">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-xs">
                      Key performance indicators: MTTR, MTTI, First Call Resolution Rate, and Incident Reopen Rate.
                    </div>
                  </div>
                </h4>
               <div className="grid grid-cols-2 gap-4">
                 <div className="text-center">
                   <div className="text-2xl font-bold text-blue-600">{Math.round(metrics.meanTimeToResolve)}</div>
                   <div className="text-sm text-gray-600">Avg MTTR (min)</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-green-600">{Math.round(metrics.meanTimeToRespond)}</div>
                   <div className="text-sm text-gray-600">Avg MTTI (min)</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-yellow-600">{metrics.firstCallResolutionRate.toFixed(1)}%</div>
                   <div className="text-sm text-gray-600">FCR Rate</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-red-600">{metrics.incidentReopenRate.toFixed(1)}%</div>
                   <div className="text-sm text-gray-600">Reopen Rate</div>
                 </div>
               </div>
             </div>

                         {/* Incidents by Department */}
             <div className="bg-gray-50 rounded-lg p-4">
               <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                 Incidents by Department
                 <div className="ml-2 relative group">
                   <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                       <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-xs">
                      Shows which departments are most affected by incidents.
                    </div>
                 </div>
               </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.incidentsByDepartment.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4ECDC4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incidents by Impact */}
          <div className="mt-6">
                         <div className="bg-gray-50 rounded-lg p-4">
               <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                 Incidents by Impact
                 <div className="ml-2 relative group">
                   <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                       <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 max-w-xs">
                      Distribution of incidents by their impact level (high, medium, low, etc.).
                    </div>
                 </div>
               </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.incidentsByImpact}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="impact" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
