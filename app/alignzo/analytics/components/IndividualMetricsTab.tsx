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
import { UserCheck, Clock, Target, Activity, HelpCircle, Image } from 'lucide-react';

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
  hoursByWorkType: Record<string, number>;
}

interface IndividualMetricsTabProps {
  data: IndividualMetrics[];
  chartRefs: any;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

export default function IndividualMetricsTab({ data, chartRefs, downloadChartAsImage }: IndividualMetricsTabProps) {
  const chartData = data.map(individual => ({
    name: individual.userName,
    occupancyRate: individual.occupancyRate,
    totalHours: individual.totalWorkedHours
  }));

  // Prepare stacked bar chart data for individual hours by project
  const stackedChartData = data.map(individual => {
    const projectData: any = { name: individual.userName };
    Object.entries(individual.projectHours).forEach(([project, hours]) => {
      projectData[project] = hours;
    });
    return projectData;
  });

  // Prepare work type distribution data
  const workTypeData = data.flatMap(individual => 
    Object.entries(individual.hoursByWorkType).map(([workType, hours]) => ({
      userName: individual.userName,
      workType,
      hours
    }))
  );

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

        {/* Individual Hours by Project - Stacked Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">Individual Hours by Project</h3>
              <InfoTooltip content="Stacked bar chart showing how each individual's time is distributed across different projects.">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
              </InfoTooltip>
            </div>
            <button
              onClick={() => downloadChartAsImage('individual-project-hours', 'individual-project-hours-chart')}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Image className="h-4 w-4 mr-1" />
              Download
            </button>
          </div>
          <div className="h-64" ref={(el) => { chartRefs.current['individual-project-hours'] = el; }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stackedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value} hours`, 'Hours']} />
                <Legend />
                {Object.keys(stackedChartData[0] || {}).filter(key => key !== 'name').map((project, index) => (
                  <Bar key={project} dataKey={project} fill={COLORS[index % COLORS.length]} stackId="hours" />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Work Type Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Hours by Work Type</h3>
            <InfoTooltip content="Distribution of individual hours across different work types (e.g., Internal vs External, Development vs Testing).">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('individual-work-type', 'individual-work-type-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['individual-work-type'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={workTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ userName, workType, hours }) => `${userName} - ${workType}: ${hours.toFixed(1)}h`}
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

      {/* Task Contribution Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Task Contribution Analysis</h3>
          <InfoTooltip content="Detailed breakdown of individual contributions to specific tasks across projects.">
            <HelpCircle className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Contributed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.flatMap(individual => 
                individual.taskContributions.map((task, taskIndex) => (
                  <tr key={`${individual.userEmail}-${taskIndex}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{individual.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.ticketId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.projectName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.hours.toFixed(2)}h</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Hours</th>
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
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      {Object.entries(individual.projectHours).map(([project, hours]) => (
                        <div key={project} className="text-xs">
                          <span className="font-medium">{project}:</span> {hours.toFixed(2)}h
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
