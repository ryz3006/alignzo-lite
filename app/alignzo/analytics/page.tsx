'use client';

import { useEffect, useState, useRef } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, WorkLog, Project, User, Team } from '@/lib/supabase';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Download, 
  Filter,
  Target,
  Clock,
  UserCheck,
  FolderOpen,
  Activity,
  Check,
  Image,
  HelpCircle
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import toast from 'react-hot-toast';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

// Info Tooltip Component
function InfoTooltip({ children, content }: { children: React.ReactNode, content: string }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}

// Types for analytics data
interface TeamMetrics {
  teamName: string;
  occupancyRate: number;
  totalWorkedHours: number;
  totalAvailableHours: number;
  memberCount: number;
  ftePerProject: Record<string, number>;
}

interface ProjectMetrics {
  projectName: string;
  totalHours: number;
  userCount: number;
  averageHoursPerUser: number;
  categoryDistribution: Record<string, number>;
  averageTimePerTask: number;
  taskCount: number;
  fte: number;
  categoryOptions: Record<string, { [key: string]: number }>;
}

interface IndividualMetrics {
  userName: string;
  userEmail: string;
  occupancyRate: number;
  totalWorkedHours: number;
  availableHours: number;
  projectHours: Record<string, number>;
  taskContributions: Array<{
    ticketId: string;
    hours: number;
    projectName: string;
  }>;
}

interface TrendData {
  date: string;
  teamOccupancy: number;
  projectHours: number;
  individualOccupancy: number;
}

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  selectedTeams: string[];
  selectedProjects: string[];
  selectedUsers: string[];
  showTeamDropdown: boolean;
  showProjectDropdown: boolean;
  showUserDropdown: boolean;
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('team');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    selectedTeams: [],
    selectedProjects: [],
    selectedUsers: [],
    showTeamDropdown: false,
    showProjectDropdown: false,
    showUserDropdown: false
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(filters);

  // Analytics data states
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics[]>([]);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [individualMetrics, setIndividualMetrics] = useState<IndividualMetrics[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);


  // Chart refs for download
  const chartRefs = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    loadAnalytics();
  }, [appliedFilters]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (!currentUser?.email) return;

      // Load all necessary data
      const [workLogs, teams, projects, users] = await Promise.all([
        loadWorkLogs(),
        loadTeams(),
        loadProjects(),
        loadUsers()
      ]);

      // Calculate metrics
      const teamData = calculateTeamMetrics(workLogs, teams, projects, users);
      const projectData = calculateProjectMetrics(workLogs, projects, users);
      const individualData = calculateIndividualMetrics(workLogs, users);
      const trendData = calculateTrendData(workLogs, teams, projects);

      setTeamMetrics(teamData);
      setProjectMetrics(projectData);
      setIndividualMetrics(individualData);
      setTrendData(trendData);

      // Set available filter options
      setAvailableTeams(teams.map(t => t.name));
      setAvailableProjects(projects.map(p => p.name));
      setAvailableUsers(users.map(u => u.email));

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

    const loadWorkLogs = async () => {
    let query = supabase
        .from('work_logs')
        .select(`
          *,
          project:projects(*)
        `)
      .gte('start_time', appliedFilters.dateRange.start)
      .lte('start_time', appliedFilters.dateRange.end);

    // Apply user email filter if specified
    if (appliedFilters.selectedUsers.length > 0) {
      query = query.in('user_email', appliedFilters.selectedUsers);
    }

    const { data, error } = await query.order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  };

    const loadTeams = async () => {
    let query = supabase
        .from('teams')
        .select(`
          *,
          team_members(*)
        `);

    // Apply team name filter if specified
    if (appliedFilters.selectedTeams.length > 0) {
      query = query.in('name', appliedFilters.selectedTeams);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  };

  const loadProjects = async () => {
    let query = supabase
      .from('projects')
      .select('*');

    // Apply project name filter if specified
    if (appliedFilters.selectedProjects.length > 0) {
      query = query.in('name', appliedFilters.selectedProjects);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;
    return data || [];
  };



  const calculateTeamMetrics = (workLogs: any[], teams: any[], projects: any[], users: any[]) => {
    const standardWorkHoursPerDay = 8;
    const workingDaysInPeriod = calculateWorkingDays(appliedFilters.dateRange.start, appliedFilters.dateRange.end);

    // Filter teams based on selection
    const filteredTeams = appliedFilters.selectedTeams.length > 0 
      ? teams.filter(team => appliedFilters.selectedTeams.includes(team.name))
      : teams;

    return filteredTeams.map(team => {
      const teamMembers = team.team_members || [];
      const memberEmails = teamMembers.map((member: any) => {
        const user = users.find(u => u.id === member.user_id);
        return user?.email;
      }).filter(Boolean);

      const teamLogs = workLogs.filter(log => memberEmails.includes(log.user_email));
      const totalWorkedHours = teamLogs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      const totalAvailableHours = memberEmails.length * standardWorkHoursPerDay * workingDaysInPeriod;
      const occupancyRate = totalAvailableHours > 0 ? (totalWorkedHours / totalAvailableHours) * 100 : 0;

      // Calculate FTE per project
      const ftePerProject: Record<string, number> = {};
      const projectGroups = groupBy(teamLogs, 'project.name');
      
      Object.entries(projectGroups).forEach(([projectName, logs]) => {
        const projectHours = (logs as any[]).reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
        const standardFteHours = standardWorkHoursPerDay * workingDaysInPeriod;
        ftePerProject[projectName] = standardFteHours > 0 ? projectHours / standardFteHours : 0;
      });

      return {
        teamName: team.name,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
        totalAvailableHours: Math.round(totalAvailableHours * 100) / 100,
        memberCount: memberEmails.length,
        ftePerProject
      };
    });
  };

  const calculateProjectMetrics = (workLogs: any[], projects: any[], users: any[]) => {
    const standardWorkHoursPerDay = 8;
    const workingDaysInPeriod = calculateWorkingDays(appliedFilters.dateRange.start, appliedFilters.dateRange.end);

    // Filter projects based on selection
    const filteredProjects = appliedFilters.selectedProjects.length > 0 
      ? projects.filter(project => appliedFilters.selectedProjects.includes(project.name))
      : projects;

    return filteredProjects.map(project => {
      const projectLogs = workLogs.filter(log => log.project?.id === project.id);
      const totalHours = projectLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      const uniqueUsers = new Set(projectLogs.map((log: any) => log.user_email));
      const uniqueTasks = new Set(projectLogs.map((log: any) => log.ticket_id));

      // Calculate FTE
      const standardFteHours = standardWorkHoursPerDay * workingDaysInPeriod;
      const fte = standardFteHours > 0 ? totalHours / standardFteHours : 0;

      // Calculate category distribution
      const categoryDistribution: Record<string, number> = {};
      const categoryOptions: Record<string, { [key: string]: number }> = {};
      
      projectLogs.forEach((log: any) => {
        Object.entries(log.dynamic_category_selections || {}).forEach(([category, value]) => {
          if (!categoryDistribution[category]) categoryDistribution[category] = 0;
          categoryDistribution[category] += (log.logged_duration_seconds || 0) / 3600;
          
          if (!categoryOptions[category]) categoryOptions[category] = {};
          if (!categoryOptions[category][value as string]) categoryOptions[category][value as string] = 0;
          categoryOptions[category][value as string] += (log.logged_duration_seconds || 0) / 3600;
        });
      });

      return {
        projectName: project.name,
        totalHours: Math.round(totalHours * 100) / 100,
        userCount: uniqueUsers.size,
        averageHoursPerUser: uniqueUsers.size > 0 ? Math.round((totalHours / uniqueUsers.size) * 100) / 100 : 0,
        categoryDistribution,
        averageTimePerTask: uniqueTasks.size > 0 ? Math.round((totalHours / uniqueTasks.size) * 100) / 100 : 0,
        taskCount: uniqueTasks.size,
        fte: Math.round(fte * 100) / 100,
        categoryOptions
      };
    });
  };

  const calculateIndividualMetrics = (workLogs: any[], users: any[]) => {
    const standardWorkHoursPerDay = 8;
    const workingDaysInPeriod = calculateWorkingDays(appliedFilters.dateRange.start, appliedFilters.dateRange.end);

    // Filter users based on selection
    const filteredUsers = appliedFilters.selectedUsers.length > 0 
      ? users.filter(user => appliedFilters.selectedUsers.includes(user.email))
      : users;

    return filteredUsers.map(user => {
      const userLogs = workLogs.filter(log => log.user_email === user.email);
      const totalWorkedHours = userLogs.reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      const availableHours = standardWorkHoursPerDay * workingDaysInPeriod;
      const occupancyRate = availableHours > 0 ? (totalWorkedHours / availableHours) * 100 : 0;

      // Calculate hours by project
      const projectHours: Record<string, number> = {};
      const projectGroups = groupBy(userLogs, 'project.name');
      Object.entries(projectGroups).forEach(([projectName, logs]) => {
        projectHours[projectName] = (logs as any[]).reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      });

      // Calculate task contributions
      const taskContributions = userLogs.map((log: any) => ({
        ticketId: log.ticket_id,
        hours: (log.logged_duration_seconds || 0) / 3600,
        projectName: log.project?.name || 'Unknown'
      }));

      return {
        userName: user.full_name,
        userEmail: user.email,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
        availableHours: Math.round(availableHours * 100) / 100,
        projectHours,
        taskContributions
      };
    });
  };

  const calculateTrendData = (workLogs: any[], teams: any[], projects: any[]) => {
    // Group by week for trend analysis
    const weeklyData = groupByWeek(workLogs);
    
    return Object.entries(weeklyData).map(([week, logs]) => {
      const teamOccupancy = calculateWeeklyTeamOccupancy(logs as any[], teams);
      const projectHours = (logs as any[]).reduce((sum: number, log: any) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
      const individualOccupancy = calculateWeeklyIndividualOccupancy(logs as any[]);

      return {
        date: week,
        teamOccupancy: Math.round(teamOccupancy * 100) / 100,
        projectHours: Math.round(projectHours * 100) / 100,
        individualOccupancy: Math.round(individualOccupancy * 100) / 100
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Helper functions
  const calculateWorkingDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    
    return workingDays;
  };

  const groupBy = (array: any[], key: string) => {
    return array.reduce((groups: any, item: any) => {
      const group = key.split('.').reduce((obj: any, k: string) => obj?.[k], item) || 'Unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  };

  const groupByWeek = (logs: any[]) => {
    return logs.reduce((groups: any, log: any) => {
      const date = new Date(log.start_time);
      const week = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()).toISOString().split('T')[0];
      groups[week] = groups[week] || [];
      groups[week].push(log);
      return groups;
    }, {});
  };

  const calculateWeeklyTeamOccupancy = (logs: any[], teams: any[]) => {
    // Simplified calculation for weekly team occupancy
    const totalHours = logs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
    const estimatedAvailableHours = logs.length * 8 * 5; // Rough estimate
    return estimatedAvailableHours > 0 ? (totalHours / estimatedAvailableHours) * 100 : 0;
  };

  const calculateWeeklyIndividualOccupancy = (logs: any[]) => {
    const totalHours = logs.reduce((sum, log) => sum + (log.logged_duration_seconds || 0), 0) / 3600;
    const estimatedAvailableHours = 8 * 5; // 40 hours per week
    return estimatedAvailableHours > 0 ? (totalHours / estimatedAvailableHours) * 100 : 0;
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.filter-dropdown')) {
        setFilters(prev => ({
          ...prev,
          showTeamDropdown: false,
          showProjectDropdown: false,
          showUserDropdown: false
        }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = () => {
    let csvContent = '';
    let filename = '';

    switch (activeTab) {
      case 'team':
        csvContent = [
          ['Team Name', 'Occupancy Rate (%)', 'Total Worked Hours', 'Total Available Hours', 'Member Count'],
          ...teamMetrics.map(team => [
            team.teamName,
            team.occupancyRate.toString(),
            team.totalWorkedHours.toString(),
            team.totalAvailableHours.toString(),
            team.memberCount.toString(),
          ])
        ].map(row => row.join(',')).join('\n');
        filename = 'team-analytics.csv';
        break;
      case 'project':
        csvContent = [
          ['Project Name', 'Total Hours', 'User Count', 'Average Hours per User', 'Task Count', 'Average Time per Task', 'FTE'],
          ...projectMetrics.map(project => [
            project.projectName,
            project.totalHours.toString(),
            project.userCount.toString(),
            project.averageHoursPerUser.toString(),
            project.taskCount.toString(),
            project.averageTimePerTask.toString(),
            project.fte.toString(),
          ])
        ].map(row => row.join(',')).join('\n');
        filename = 'project-analytics.csv';
        break;
      case 'individual':
        csvContent = [
          ['User Name', 'Email', 'Occupancy Rate (%)', 'Total Worked Hours', 'Available Hours'],
          ...individualMetrics.map(individual => [
            individual.userName,
            individual.userEmail,
            individual.occupancyRate.toString(),
            individual.totalWorkedHours.toString(),
            individual.availableHours.toString(),
          ])
        ].map(row => row.join(',')).join('\n');
        filename = 'individual-analytics.csv';
        break;
      case 'trends':
        csvContent = [
          ['Date', 'Team Occupancy (%)', 'Project Hours', 'Individual Occupancy (%)'],
          ...trendData.map(trend => [
            trend.date,
            trend.teamOccupancy.toString(),
            trend.projectHours.toString(),
            trend.individualOccupancy.toString(),
          ])
        ].map(row => row.join(',')).join('\n');
        filename = 'trend-analytics.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadChartAsImage = (chartId: string, filename: string) => {
    const chartElement = chartRefs.current[chartId];
    if (chartElement) {
      // Create a canvas and draw the chart
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 600;
      
      // Convert SVG to image (simplified approach)
      const svgElement = chartElement.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new window.Image();
        img.onload = () => {
          ctx?.drawImage(img, 0, 0, 800, 600);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive team and project performance insights</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          </div>
          <button
            onClick={handleApplyFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Check className="h-4 w-4 mr-2" />
            Apply Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
                                 <div className="relative filter-dropdown">
              <label className="block text-sm font-medium text-gray-700 mb-1">Teams</label>
              <div className="relative">
               <button
                 type="button"
                 onClick={() => setFilters(prev => ({ ...prev, showTeamDropdown: !prev.showTeamDropdown }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
               >
                 <span className="text-sm text-gray-700">
                   {filters.selectedTeams.length === 0 
                     ? 'All Teams' 
                     : filters.selectedTeams.length === 1 
                       ? filters.selectedTeams[0] 
                       : `${filters.selectedTeams.length} teams selected`}
                 </span>
                 <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </button>
               {filters.showTeamDropdown && (
                 <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                   <div className="p-2">
                     {availableTeams.map(team => (
                       <label key={team} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-1">
                         <input
                           type="checkbox"
                           checked={filters.selectedTeams.includes(team)}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setFilters(prev => ({ ...prev, selectedTeams: [...prev.selectedTeams, team] }));
                             } else {
                               setFilters(prev => ({ ...prev, selectedTeams: prev.selectedTeams.filter(t => t !== team) }));
                             }
                           }}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                         />
                         <span className="text-sm text-gray-700">{team}</span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
                       <div className="relative filter-dropdown">
              <label className="block text-sm font-medium text-gray-700 mb-1">Projects</label>
              <div className="relative">
               <button
                 type="button"
                 onClick={() => setFilters(prev => ({ ...prev, showProjectDropdown: !prev.showProjectDropdown }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
               >
                 <span className="text-sm text-gray-700">
                   {filters.selectedProjects.length === 0 
                     ? 'All Projects' 
                     : filters.selectedProjects.length === 1 
                       ? filters.selectedProjects[0] 
                       : `${filters.selectedProjects.length} projects selected`}
                 </span>
                 <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </button>
               {filters.showProjectDropdown && (
                 <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                   <div className="p-2">
                     {availableProjects.map(project => (
                       <label key={project} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-1">
                         <input
                           type="checkbox"
                           checked={filters.selectedProjects.includes(project)}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setFilters(prev => ({ ...prev, selectedProjects: [...prev.selectedProjects, project] }));
                             } else {
                               setFilters(prev => ({ ...prev, selectedProjects: prev.selectedProjects.filter(p => p !== project) }));
                             }
                           }}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                         />
                         <span className="text-sm text-gray-700">{project}</span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
                       <div className="relative filter-dropdown">
              <label className="block text-sm font-medium text-gray-700 mb-1">Users</label>
              <div className="relative">
               <button
                 type="button"
                 onClick={() => setFilters(prev => ({ ...prev, showUserDropdown: !prev.showUserDropdown }))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
               >
                 <span className="text-sm text-gray-700">
                   {filters.selectedUsers.length === 0 
                     ? 'All Users' 
                     : filters.selectedUsers.length === 1 
                       ? filters.selectedUsers[0] 
                       : `${filters.selectedUsers.length} users selected`}
                 </span>
                 <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </button>
               {filters.showUserDropdown && (
                 <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                   <div className="p-2">
                     {availableUsers.map(userEmail => (
                       <label key={userEmail} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-1">
                         <input
                           type="checkbox"
                           checked={filters.selectedUsers.includes(userEmail)}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setFilters(prev => ({ ...prev, selectedUsers: [...prev.selectedUsers, userEmail] }));
                             } else {
                               setFilters(prev => ({ ...prev, selectedUsers: prev.selectedUsers.filter(u => u !== userEmail) }));
                             }
                           }}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                         />
                         <span className="text-sm text-gray-700">{userEmail}</span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'team', label: 'Team Metrics', icon: Users },
              { id: 'project', label: 'Project Metrics', icon: FolderOpen },
              { id: 'individual', label: 'Individual Metrics', icon: UserCheck },
              { id: 'trends', label: 'Trend Analysis', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'team' && <TeamMetricsTab data={teamMetrics} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />}
          {activeTab === 'project' && <ProjectMetricsTab data={projectMetrics} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />}
          {activeTab === 'individual' && <IndividualMetricsTab data={individualMetrics} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />}
          {activeTab === 'trends' && <TrendsTab data={trendData} chartRefs={chartRefs} downloadChartAsImage={downloadChartAsImage} />}
        </div>
      </div>
    </div>
  );
}

// Team Metrics Tab Component
function TeamMetricsTab({ data, chartRefs, downloadChartAsImage }: { data: TeamMetrics[], chartRefs: any, downloadChartAsImage: (chartId: string, filename: string) => void }) {
  const chartData = data.map(team => ({
    name: team.teamName,
    occupancyRate: team.occupancyRate,
    totalHours: team.totalWorkedHours,
    memberCount: team.memberCount
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Teams</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </div>
            </div>
            <InfoTooltip content="Number of teams in the system. Each team can have multiple members working on different projects.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Hours</p>
                <p className="text-2xl font-bold">{data.reduce((sum, team) => sum + team.totalWorkedHours, 0).toFixed(1)}h</p>
              </div>
            </div>
            <InfoTooltip content="Sum of all hours logged by team members across all projects within the selected date range.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Avg Occupancy</p>
                <p className="text-2xl font-bold">{data.length > 0 ? (data.reduce((sum, team) => sum + team.occupancyRate, 0) / data.length).toFixed(1) : 0}%</p>
              </div>
            </div>
            <InfoTooltip content="Average team occupancy rate across all teams. Calculated as: (Total Worked Hours / Total Available Hours) × 100. Available hours = 8 hours/day × working days × team members.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Members</p>
                <p className="text-2xl font-bold">{data.reduce((sum, team) => sum + team.memberCount, 0)}</p>
              </div>
            </div>
            <InfoTooltip content="Total number of team members across all teams. This includes all users who are assigned to any team.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Occupancy Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Team Occupancy Rate</h3>
              <InfoTooltip content="Shows the percentage of time each team was actively working compared to their available time. Higher percentages indicate better team utilization.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('team-occupancy', 'team-occupancy-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
          <div className="h-64" ref={(el) => { chartRefs.current['team-occupancy'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Occupancy Rate']} />
                <Bar dataKey="occupancyRate" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Hours Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Team Hours Distribution</h3>
              <InfoTooltip content="Pie chart showing how total hours are distributed across different teams. Larger slices indicate teams with more logged hours.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('team-hours', 'team-hours-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
          <div className="h-64" ref={(el) => { chartRefs.current['team-hours'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalHours"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} hours`, 'Total Hours']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Team Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy Rate (%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Worked Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((team, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{team.teamName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{team.occupancyRate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{team.totalWorkedHours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{team.totalAvailableHours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{team.memberCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Project Metrics Tab Component
function ProjectMetricsTab({ data, chartRefs, downloadChartAsImage }: { data: ProjectMetrics[], chartRefs: any, downloadChartAsImage: (chartId: string, filename: string) => void }) {
  const chartData = data.map(project => ({
    name: project.projectName,
    totalHours: project.totalHours,
    userCount: project.userCount,
    averageTimePerTask: project.averageTimePerTask,
    fte: project.fte
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Projects</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </div>
            </div>
            <InfoTooltip content="Number of active projects in the system. Each project can have multiple users and tasks assigned to it.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Hours</p>
                <p className="text-2xl font-bold">{data.reduce((sum, project) => sum + project.totalHours, 0).toFixed(1)}h</p>
              </div>
            </div>
            <InfoTooltip content="Sum of all hours logged across all projects within the selected date range.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Users</p>
                <p className="text-2xl font-bold">{new Set(data.flatMap(p => Array.from({ length: p.userCount }, (_, i) => `${p.projectName}-${i}`))).size}</p>
              </div>
            </div>
            <InfoTooltip content="Total number of unique users who have logged time on any project within the selected date range.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total FTE</p>
                <p className="text-2xl font-bold">{data.reduce((sum, project) => sum + project.fte, 0).toFixed(1)}</p>
              </div>
            </div>
            <InfoTooltip content="Full-Time Equivalent across all projects. FTE = Total Hours / Standard Hours (8 hours/day × working days). Shows how many full-time employees the work represents.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Hours by Project */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Total Hours by Project</h3>
              <InfoTooltip content="Bar chart showing total hours logged for each project. Taller bars indicate projects with more time investment.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('project-hours', 'project-hours-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
          <div className="h-64" ref={(el) => { chartRefs.current['project-hours'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value} hours`, 'Total Hours']} />
                <Bar dataKey="totalHours" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FTE by Project */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">FTE by Project</h3>
              <InfoTooltip content="Full-Time Equivalent for each project. Shows how many full-time employees each project would require based on the hours logged.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('project-fte', 'project-fte-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
          <div className="h-64" ref={(el) => { chartRefs.current['project-fte'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value} FTE`, 'Full-Time Equivalent']} />
                <Bar dataKey="fte" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Distribution Charts */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.keys(data[0].categoryOptions).map((category, index) => (
            <div key={category} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{category} Distribution</h3>
                <button
                  onClick={() => downloadChartAsImage(`category-${category}`, `${category}-distribution-chart`)}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Image className="h-4 w-4 mr-1" />
                  Download
                </button>
              </div>
                             <div className="h-64" ref={(el) => { chartRefs.current[`category-${category}`] = el; }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(data[0].categoryOptions[category]).map(([key, value]) => ({
                        name: key,
                        value: value
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(data[0].categoryOptions[category]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value} hours`, 'Hours']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Project Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Hours per User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time per Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FTE</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((project, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.projectName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.totalHours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.userCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.averageHoursPerUser}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.taskCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.averageTimePerTask}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.fte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Individual Metrics Tab Component
function IndividualMetricsTab({ data, chartRefs, downloadChartAsImage }: { data: IndividualMetrics[], chartRefs: any, downloadChartAsImage: (chartId: string, filename: string) => void }) {
  const chartData = data.map(individual => ({
    name: individual.userName,
    occupancyRate: individual.occupancyRate,
    totalHours: individual.totalWorkedHours
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Users</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </div>
            </div>
            <InfoTooltip content="Total number of users in the system who have logged time within the selected date range.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Hours</p>
                <p className="text-2xl font-bold">{data.reduce((sum, individual) => sum + individual.totalWorkedHours, 0).toFixed(1)}h</p>
              </div>
            </div>
            <InfoTooltip content="Sum of all hours logged by all users across all projects within the selected date range.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Avg Occupancy</p>
                <p className="text-2xl font-bold">{data.length > 0 ? (data.reduce((sum, individual) => sum + individual.occupancyRate, 0) / data.length).toFixed(1) : 0}%</p>
              </div>
            </div>
            <InfoTooltip content="Average individual occupancy rate across all users. Calculated as: (Total Worked Hours / Available Hours) × 100. Available hours = 8 hours/day × working days.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Active Users</p>
                <p className="text-2xl font-bold">{data.filter(individual => individual.totalWorkedHours > 0).length}</p>
              </div>
            </div>
            <InfoTooltip content="Number of users who have logged at least some time within the selected date range.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Occupancy Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Individual Occupancy Rate</h3>
              <InfoTooltip content="Shows the percentage of time each individual was actively working compared to their available time. Higher percentages indicate better individual utilization.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('individual-occupancy', 'individual-occupancy-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
          <div className="h-64" ref={(el) => { chartRefs.current['individual-occupancy'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Occupancy Rate']} />
                <Bar dataKey="occupancyRate" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Individual Hours Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Individual Hours Distribution</h3>
            <button
              onClick={() => downloadChartAsImage('individual-hours', 'individual-hours-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
                     <div className="h-64" ref={(el) => { chartRefs.current['individual-hours'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalHours"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} hours`, 'Total Hours']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Individual Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Individual Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy Rate (%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Worked Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Hours</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((individual, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{individual.userName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{individual.userEmail}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{individual.occupancyRate}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{individual.totalWorkedHours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{individual.availableHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Trends Tab Component
function TrendsTab({ data, chartRefs, downloadChartAsImage }: { data: TrendData[], chartRefs: any, downloadChartAsImage: (chartId: string, filename: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Data Points</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </div>
            </div>
            <InfoTooltip content="Number of time periods (weeks) included in the trend analysis. Each data point represents one week of data.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Total Hours</p>
                <p className="text-2xl font-bold">{data.reduce((sum, trend) => sum + trend.projectHours, 0).toFixed(1)}h</p>
              </div>
            </div>
            <InfoTooltip content="Sum of all project hours across all time periods in the trend analysis.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Avg Team Occupancy</p>
                <p className="text-2xl font-bold">{data.length > 0 ? (data.reduce((sum, trend) => sum + trend.teamOccupancy, 0) / data.length).toFixed(1) : 0}%</p>
              </div>
            </div>
            <InfoTooltip content="Average team occupancy rate across all time periods. Shows the overall team utilization trend.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Occupancy Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Team Occupancy Trend</h3>
              <InfoTooltip content="Line chart showing how team occupancy rates change over time. Helps identify patterns and trends in team utilization.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('team-trend', 'team-occupancy-trend-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
                     <div className="h-64" ref={(el) => { chartRefs.current['team-trend'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Occupancy Rate']} />
                <Line type="monotone" dataKey="teamOccupancy" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Hours Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Project Hours Trend</h3>
              <InfoTooltip content="Area chart showing how total project hours change over time. Helps identify busy periods and workload patterns.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('project-trend', 'project-hours-trend-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
          <div className="h-64" ref={(el) => { chartRefs.current['project-trend'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value} hours`, 'Project Hours']} />
                <Area type="monotone" dataKey="projectHours" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Trend Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Occupancy (%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Individual Occupancy (%)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((trend, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trend.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.teamOccupancy}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.projectHours}h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.individualOccupancy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
