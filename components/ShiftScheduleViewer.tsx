'use client';

import { useEffect, useState } from 'react';
import { supabase, Team, ShiftType } from '@/lib/supabase';
import { Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface ShiftScheduleViewerProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

const SHIFT_TYPES: { [key in ShiftType]: { label: string; color: string; bgColor: string } } = {
  M: { label: 'Morning', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  A: { label: 'Afternoon', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  N: { label: 'Night', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  G: { label: 'General/Day', color: 'text-green-700', bgColor: 'bg-green-100' },
  H: { label: 'Holiday', color: 'text-red-700', bgColor: 'bg-red-100' },
  L: { label: 'Leave', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

export default function ShiftScheduleViewer({ isOpen, onClose, userEmail }: ShiftScheduleViewerProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [shiftData, setShiftData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserTeams();
    }
  }, [isOpen, userEmail]);

  useEffect(() => {
    if (selectedTeam && selectedMonth && selectedYear) {
      loadTeamShiftSchedule();
    }
  }, [selectedTeam, selectedMonth, selectedYear]);

  const loadUserTeams = async () => {
    try {
      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams (*)
        `)
        .eq('users.email', userEmail);

      if (error) throw error;

      const userTeams = teamMembers?.map(tm => tm.teams as any).filter(Boolean) || [];
      setTeams(userTeams);
      
      if (userTeams.length > 0) {
        setSelectedTeam(userTeams[0].id);
      }
    } catch (error) {
      console.error('Error loading user teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const loadTeamShiftSchedule = async () => {
    try {
      setLoading(true);
      
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${daysInMonth}`;

      const { data: shifts, error } = await supabase
        .from('shift_schedules')
        .select(`
          *,
          users (email, full_name)
        `)
        .eq('team_id', selectedTeam)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date');

      if (error) throw error;

      // Group by user and date
      const userShifts: { [key: string]: any } = {};
      shifts?.forEach(shift => {
        const userEmail = (shift.users as any).email;
        if (!userShifts[userEmail]) {
          userShifts[userEmail] = {
            email: userEmail,
            name: (shift.users as any).full_name,
            shifts: {}
          };
        }
        userShifts[userEmail].shifts[shift.shift_date] = shift.shift_type;
      });

      setShiftData(Object.values(userShifts));
    } catch (error) {
      console.error('Error loading shift schedule:', error);
      toast.error('Failed to load shift schedule');
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  };

  const getShiftColor = (shiftType: string) => {
    return SHIFT_TYPES[shiftType as ShiftType]?.bgColor || 'bg-gray-100';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Shift Schedule Viewer</h2>
            <p className="text-sm text-gray-500 mt-1">
              View team shift schedules for any month
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Shift Schedule Table */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading shift schedule...</p>
            </div>
          ) : shiftData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      Team Member
                    </th>
                    {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => (
                      <th key={day} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-bold">{day}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(selectedYear, selectedMonth - 1, day).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shiftData.map((user) => (
                    <tr key={user.email}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => {
                        const date = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        const shiftType = user.shifts[date] || 'G';
                        const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                        
                        return (
                          <td
                            key={day}
                            className={`px-2 py-3 text-center border border-gray-200 ${
                              isWeekend ? 'bg-red-50' : 'bg-white'
                            }`}
                          >
                            <div 
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${getShiftColor(shiftType)}`}
                              title={`${SHIFT_TYPES[shiftType as ShiftType]?.label || 'General'} - ${date}`}
                            >
                              {shiftType}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No shift data found for the selected team and month.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
