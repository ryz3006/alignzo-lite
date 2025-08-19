'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { TrendingUp, Clock, Target, HelpCircle, Image } from 'lucide-react';

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

interface TrendData {
  date: string;
  teamOccupancy: number;
  projectHours: number;
  individualOccupancy: number;
}

interface TrendsTabProps {
  data: TrendData[];
  chartRefs: any;
  downloadChartAsImage: (chartId: string, filename: string) => void;
}

export default function TrendsTab({ data, chartRefs, downloadChartAsImage }: TrendsTabProps) {
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
                <Line type="monotone" dataKey="teamOccupancy" stroke="#3b82f6" strokeWidth={2} name="Team Occupancy" />
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
                <Area type="monotone" dataKey="projectHours" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Project Hours" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Individual Occupancy Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Individual Occupancy Trend</h3>
            <InfoTooltip content="Line chart showing how individual occupancy rates change over time. Helps identify patterns in individual productivity.">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('individual-trend', 'individual-occupancy-trend-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['individual-trend'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Occupancy Rate']} />
              <Line type="monotone" dataKey="individualOccupancy" stroke="#8b5cf6" strokeWidth={2} name="Individual Occupancy" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Combined Trend Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Combined Trend Analysis</h3>
            <InfoTooltip content="Combined chart showing team occupancy, project hours, and individual occupancy trends together for comprehensive analysis.">
              <HelpCircle className="h-4 w-4 ml-2 text-gray-500 hover:text-gray-700 cursor-help" />
            </InfoTooltip>
          </div>
          <button
            onClick={() => downloadChartAsImage('combined-trend', 'combined-trend-chart')}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Image className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
        <div className="h-64" ref={(el) => { chartRefs.current['combined-trend'] = el; }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="teamOccupancy" stroke="#3b82f6" strokeWidth={2} name="Team Occupancy (%)" />
              <Line yAxisId="left" type="monotone" dataKey="individualOccupancy" stroke="#8b5cf6" strokeWidth={2} name="Individual Occupancy (%)" />
              <Area yAxisId="right" type="monotone" dataKey="projectHours" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Project Hours" />
            </ComposedChart>
          </ResponsiveContainer>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend Analysis</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((trend, index) => {
                const prevTrend = index > 0 ? data[index - 1] : null;
                const teamChange = prevTrend ? trend.teamOccupancy - prevTrend.teamOccupancy : 0;
                const projectChange = prevTrend ? trend.projectHours - prevTrend.projectHours : 0;
                const individualChange = prevTrend ? trend.individualOccupancy - prevTrend.individualOccupancy : 0;
                
                const getTrendAnalysis = () => {
                  if (!prevTrend) return 'Baseline';
                  const changes = [];
                  if (Math.abs(teamChange) > 5) changes.push(`Team: ${teamChange > 0 ? '+' : ''}${teamChange.toFixed(1)}%`);
                  if (Math.abs(projectChange) > 5) changes.push(`Hours: ${projectChange > 0 ? '+' : ''}${projectChange.toFixed(1)}h`);
                  if (Math.abs(individualChange) > 5) changes.push(`Individual: ${individualChange > 0 ? '+' : ''}${individualChange.toFixed(1)}%`);
                  return changes.length > 0 ? changes.join(', ') : 'Stable';
                };

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trend.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.teamOccupancy}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.projectHours}h</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trend.individualOccupancy}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        getTrendAnalysis() === 'Stable' ? 'bg-gray-100 text-gray-800' :
                        getTrendAnalysis().includes('+') ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getTrendAnalysis()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
