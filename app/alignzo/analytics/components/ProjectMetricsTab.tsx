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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { FolderOpen, Clock, Users, Target, HelpCircle, Image } from 'lucide-react';

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
  burnDownData: Array<{
    date: string;
    remainingEffort: number;
    cumulativeHours: number;
  }>;
}

interface ProjectMetricsTabProps {
  data: ProjectMetrics[];
  chartRefs: any;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

export default function ProjectMetricsTab({ data, chartRefs, downloadChartAsImage }: ProjectMetricsTabProps) {
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

      {/* Burn-down Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.map((project, index) => (
          <div key={project.projectName} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">{project.projectName} - Burn-down</h3>
                <InfoTooltip content="Burn-down chart showing remaining effort over time. Helps track project progress and completion.">
                  <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
                </InfoTooltip>
              </div>
              <button
                onClick={() => downloadChartAsImage(`burn-down-${index}`, `${project.projectName}-burn-down-chart`)}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Image className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>
            <div className="h-64" ref={(el) => { chartRefs.current[`burn-down-${index}`] = el; }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={project.burnDownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value} hours`, 'Remaining Effort']} />
                  <Line type="monotone" dataKey="remainingEffort" stroke="#ef4444" strokeWidth={2} name="Remaining Effort" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
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
