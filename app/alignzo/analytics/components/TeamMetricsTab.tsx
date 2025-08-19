'use client';

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
  ComposedChart,
  Legend
} from 'recharts';
import { Users, Clock, Target, UserCheck, HelpCircle, Image } from 'lucide-react';

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

interface TeamMetrics {
  teamName: string;
  occupancyRate: number;
  totalWorkedHours: number;
  totalAvailableHours: number;
  memberCount: number;
  ftePerProject: Record<string, number>;
  hoursByWorkType: Record<string, number>;
}

interface TeamMetricsTabProps {
  data: TeamMetrics[];
  chartRefs: any;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

export default function TeamMetricsTab({ data, chartRefs, downloadChartAsImage }: TeamMetricsTabProps) {
  const chartData = data.map(team => ({
    name: team.teamName,
    occupancyRate: team.occupancyRate,
    totalHours: team.totalWorkedHours,
    memberCount: team.memberCount
  }));

  // Prepare FTE per project data for stacked chart
  const fteChartData = data.map(team => {
    const fteData: any = { name: team.teamName };
    Object.entries(team.ftePerProject).forEach(([project, fte]) => {
      fteData[project] = fte;
    });
    return fteData;
  });

  // Prepare work type distribution data
  const workTypeData = data.flatMap(team => 
    Object.entries(team.hoursByWorkType).map(([workType, hours]) => ({
      teamName: team.teamName,
      workType,
      hours
    }))
  );

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

      {/* Team FTE per Project - Stacked Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Team FTE per Project</h3>
            <InfoTooltip content="Full-Time Equivalent for each team across different projects. Shows how team effort is distributed across projects.">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('team-fte', 'team-fte-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['team-fte'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={fteChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value} FTE`, 'Full-Time Equivalent']} />
              <Legend />
              {Object.keys(fteChartData[0] || {}).filter(key => key !== 'name').map((project, index) => (
                <Bar key={project} dataKey={project} fill={COLORS[index % COLORS.length]} stackId="fte" />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Work Type Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Hours by Work Type</h3>
            <InfoTooltip content="Distribution of team hours across different work types (e.g., Internal vs External, Development vs Testing).">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('work-type-distribution', 'work-type-distribution-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['work-type-distribution'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={workTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ teamName, workType, hours }) => `${teamName} - ${workType}: ${hours.toFixed(1)}h`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="hours"
              >
                {workTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} hours`, 'Hours']} />
            </RechartsPieChart>
          </ResponsiveContainer>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FTE per Project</th>
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
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      {Object.entries(team.ftePerProject).map(([project, fte]) => (
                        <div key={project} className="text-xs">
                          <span className="font-medium">{project}:</span> {fte.toFixed(2)} FTE
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
