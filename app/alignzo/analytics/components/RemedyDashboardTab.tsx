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
  incidentsByRegion: Array<{ region: string; count: number }>;
  incidentTrendOverTime: Array<{ date: string; count: number }>;
  incidentsByReportedSource: Array<{ source: string; count: number }>;
  
  // Performance & Efficiency
  meanTimeToRespond: number; // in minutes
  meanTimeToResolve: number; // in minutes
  firstCallResolutionRate: number; // percentage
  incidentReopenRate: number; // percentage
  
  // Team & Group Performance
  incidentsPerAssignee: Array<{ assignee: string; count: number }>;
  resolutionRateByGroup: Array<{ group: string; rate: number; total: number; resolved: number }>;
  averageResolutionTimeByGroup: Array<{ group: string; avgTime: number }>;
  groupTransferAnalysis: Array<{ group: string; transfers: number }>;
  
  // Categorization & Product Analysis
  incidentsByProduct: Array<{ product: string; count: number }>;
  incidentsByOperationalCategory: Array<{ category: string; count: number }>;
  incidentsByProductCategorization: Array<{ category: string; count: number }>;
  
  // User & Customer Impact
  incidentsByVIPStatus: Array<{ status: string; count: number }>;
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
        ['Incidents by Region', ''],
        ...metrics.incidentsByRegion.map(item => [item.region, item.count]),
        ['', ''],
        ['Top Assignees', ''],
        ...metrics.incidentsPerAssignee.slice(0, 10).map(item => [item.assignee, item.count])
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

    const incidentsByRegion = Object.entries(
      tickets.reduce((acc, ticket) => {
        const region = ticket.region || 'Unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([region, count]) => ({ region, count: count as number }));

    const incidentTrendOverTime = Object.entries(
      tickets.reduce((acc, ticket) => {
        const date = ticket.reported_date1 ? new Date(ticket.reported_date1).toISOString().split('T')[0] : 'Unknown';
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([date, count]) => ({ date, count: count as number })).sort((a, b) => a.date.localeCompare(b.date));

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

    const resolutionRateByGroup = Object.entries(
      tickets.reduce((acc, ticket) => {
        const group = ticket.resolver_group || 'Unknown';
        if (!acc[group]) {
          acc[group] = { total: 0, resolved: 0 };
        }
        acc[group].total++;
        if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
          acc[group].resolved++;
        }
        return acc;
      }, {} as Record<string, { total: number; resolved: number }>)
    ).map(([group, data]) => ({
      group,
      rate: (data as { total: number; resolved: number }).total > 0 ? ((data as { total: number; resolved: number }).resolved / (data as { total: number; resolved: number }).total) * 100 : 0,
      total: (data as { total: number; resolved: number }).total,
      resolved: (data as { total: number; resolved: number }).resolved
    }));

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

    const groupTransferAnalysis = Object.entries(
      tickets.reduce((acc, ticket) => {
        const group = ticket.assigned_group || 'Unknown';
        const transfers = parseInt(ticket.group_transfers || '0');
        acc[group] = (acc[group] || 0) + transfers;
        return acc;
      }, {} as Record<string, number>)
    ).map(([group, transfers]) => ({ group, transfers: transfers as number }));

    // 4. Categorization & Product Analysis
    const incidentsByProduct = Object.entries(
      tickets.reduce((acc, ticket) => {
        const product = ticket.product_name || 'Unknown';
        acc[product] = (acc[product] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([product, count]) => ({ product, count: count as number }));

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

    // 5. User & Customer Impact
    const incidentsByVIPStatus = Object.entries(
      tickets.reduce((acc, ticket) => {
        const status = ticket.vip === 'Yes' ? 'VIP' : 'Non-VIP';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([status, count]) => ({ status, count: count as number }));

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
      incidentsByRegion,
      incidentTrendOverTime,
      incidentsByReportedSource,
      meanTimeToRespond,
      meanTimeToResolve,
      firstCallResolutionRate,
      incidentReopenRate,
      incidentsPerAssignee,
      resolutionRateByGroup,
      averageResolutionTimeByGroup,
      groupTransferAnalysis,
      incidentsByProduct,
      incidentsByOperationalCategory,
      incidentsByProductCategorization,
      incidentsByVIPStatus,
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
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalIncidents.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg MTTR (min)</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.meanTimeToResolve)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">FCR Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.firstCallResolutionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Reopen Rate</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.incidentReopenRate.toFixed(1)}%</p>
            </div>
          </div>
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
              <h4 className="text-md font-medium text-gray-900 mb-4">Incident Trend Over Time</h4>
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
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by Priority</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.incidentsByPriority}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
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
            {/* Incidents by Region */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by Region</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.incidentsByRegion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Incidents by Reported Source */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by Reported Source</h4>
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
              <h4 className="text-md font-medium text-gray-900 mb-4">Response vs Resolution Time</h4>
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

            {/* Resolution Rate by Group */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Resolution Rate by Group</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.resolutionRateByGroup}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="group" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#82CA9D" />
                </BarChart>
              </ResponsiveContainer>
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
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents per Assignee</h4>
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

            {/* Group Transfer Analysis */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Group Transfer Analysis</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.groupTransferAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="group" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="transfers" fill="#8DD1E1" />
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
            {/* Incidents by Product */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by Product</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.incidentsByProduct.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF6B6B" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Incidents by Operational Category */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by Operational Category</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.incidentsByOperationalCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
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
            {/* Incidents by VIP Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by VIP Status</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.incidentsByVIPStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {metrics.incidentsByVIPStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Incidents by Department */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by Department</h4>
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
              <h4 className="text-md font-medium text-gray-900 mb-4">Incidents by Impact</h4>
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
