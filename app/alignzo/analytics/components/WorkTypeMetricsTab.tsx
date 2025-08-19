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
import { Layers, Clock, Target, Activity, HelpCircle, Image } from 'lucide-react';

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

interface WorkTypeMetrics {
  workType: string;
  totalHours: number;
  projectDistribution: Record<string, number>;
  teamDistribution: Record<string, number>;
}

interface WorkTypeMetricsTabProps {
  data: WorkTypeMetrics[];
  chartRefs: any;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

export default function WorkTypeMetricsTab({ data, chartRefs, downloadChartAsImage }: WorkTypeMetricsTabProps) {
  const chartData = data.map(workType => ({
    name: workType.workType,
    totalHours: workType.totalHours
  }));

  // Prepare project distribution data for stacked chart
  const projectDistributionData = data.map(workType => {
    const projectData: any = { name: workType.workType };
    Object.entries(workType.projectDistribution).forEach(([project, hours]) => {
      projectData[project] = hours;
    });
    return projectData;
  });

  // Prepare team distribution data for stacked chart
  const teamDistributionData = data.map(workType => {
    const teamData: any = { name: workType.workType };
    Object.entries(workType.teamDistribution).forEach(([team, hours]) => {
      teamData[team] = hours;
    });
    return teamData;
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Layers className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Work Types</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </div>
            </div>
            <InfoTooltip content="Number of different work types identified in the system (e.g., Internal, External, Development, Testing).">
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
                <p className="text-2xl font-bold">{data.reduce((sum, workType) => sum + workType.totalHours, 0).toFixed(1)}h</p>
              </div>
            </div>
            <InfoTooltip content="Sum of all hours logged across all work types within the selected date range.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Avg Hours/Type</p>
                <p className="text-2xl font-bold">{data.length > 0 ? (data.reduce((sum, workType) => sum + workType.totalHours, 0) / data.length).toFixed(1) : 0}h</p>
              </div>
            </div>
            <InfoTooltip content="Average hours logged per work type. Shows the typical effort distribution across different work categories.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-8 w-8 mr-3" />
              <div>
                <p className="text-sm opacity-90">Most Active</p>
                <p className="text-2xl font-bold">{data.length > 0 ? data.reduce((max, workType) => workType.totalHours > max.totalHours ? workType : max).workType : 'N/A'}</p>
              </div>
            </div>
            <InfoTooltip content="The work type with the highest number of logged hours. Indicates the most common type of work being performed.">
              <HelpCircle className="h-4 w-4 opacity-70 hover:opacity-100 cursor-help" />
            </InfoTooltip>
          </div>
        </div>
      </div>

      {/* Work Type Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Total Hours by Work Type</h3>
            <InfoTooltip content="Bar chart showing total hours logged for each work type. Helps identify which types of work consume the most time.">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('work-type-hours', 'work-type-hours-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['work-type-hours'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value} hours`, 'Total Hours']} />
              <Bar dataKey="totalHours" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Work Type Distribution Pie Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Work Type Distribution</h3>
            <InfoTooltip content="Pie chart showing the proportion of time spent on each work type. Larger slices indicate work types that consume more time.">
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

      {/* Work Type by Project - Stacked Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Work Type Distribution by Project</h3>
            <InfoTooltip content="Stacked bar chart showing how different work types are distributed across projects. Helps identify which projects focus on specific work types.">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('work-type-by-project', 'work-type-by-project-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['work-type-by-project'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={projectDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value} hours`, 'Hours']} />
              <Legend />
              {Object.keys(projectDistributionData[0] || {}).filter(key => key !== 'name').map((project, index) => (
                <Bar key={project} dataKey={project} fill={COLORS[index % COLORS.length]} stackId="project" />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Work Type by Team - Stacked Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Work Type Distribution by Team</h3>
            <InfoTooltip content="Stacked bar chart showing how different work types are distributed across teams. Helps identify which teams specialize in specific work types.">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('work-type-by-team', 'work-type-by-team-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['work-type-by-team'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={teamDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value} hours`, 'Hours']} />
              <Legend />
              {Object.keys(teamDistributionData[0] || {}).filter(key => key !== 'name').map((team, index) => (
                <Bar key={team} dataKey={team} fill={COLORS[index % COLORS.length]} stackId="team" />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Work Type Details Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Work Type Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Distribution</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Distribution</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((workType, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{workType.workType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{workType.totalHours.toFixed(2)}h</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      {Object.entries(workType.projectDistribution).map(([project, hours]) => (
                        <div key={project} className="text-xs">
                          <span className="font-medium">{project}:</span> {hours.toFixed(2)}h
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="space-y-1">
                      {Object.entries(workType.teamDistribution).map(([team, hours]) => (
                        <div key={team} className="text-xs">
                          <span className="font-medium">{team}:</span> {hours.toFixed(2)}h
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
