'use client';

import { useEffect, useState } from 'react';
import { supabase, Project, Team, ShiftSchedule, ShiftType } from '@/lib/supabase';
import { Calendar, Download, Save, ChevronLeft, ChevronRight, Upload, Settings } from 'lucide-react';
import ShiftEnumModal from './ShiftEnumModal';
import toast from 'react-hot-toast';

interface TeamMember {
  user_email: string;
  full_name: string;
}

interface ShiftScheduleData {
  user_email: string;
  full_name: string;
  shifts: { [date: string]: ShiftType };
}

const SHIFT_TYPES: { [key in ShiftType]: { label: string; color: string; bgColor: string } } = {
  M: { label: 'Morning', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  A: { label: 'Afternoon', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  N: { label: 'Night', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  G: { label: 'General/Day', color: 'text-green-700', bgColor: 'bg-green-100' },
  H: { label: 'Holiday', color: 'text-red-700', bgColor: 'bg-red-100' },
  L: { label: 'Leave', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

export default function ShiftSchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projectTeams, setProjectTeams] = useState<Team[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [shiftData, setShiftData] = useState<ShiftScheduleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showShiftEnumModal, setShowShiftEnumModal] = useState(false);
  const [customShiftEnums, setCustomShiftEnums] = useState<any[]>([]);

  useEffect(() => {
    loadProjects();
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectTeams();
      setSelectedTeam('');
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && selectedTeam) {
      loadTeamMembers();
    }
  }, [selectedProject, selectedTeam]);

  useEffect(() => {
    if (selectedProject && selectedTeam && selectedYear && selectedMonth) {
      loadShiftSchedule();
      loadCustomShiftEnums();
    }
  }, [selectedProject, selectedTeam, selectedYear, selectedMonth]);

  // Refresh data when modal closes
  useEffect(() => {
    if (!showShiftEnumModal && selectedProject && selectedTeam) {
      loadCustomShiftEnums();
    }
  }, [showShiftEnumModal, selectedProject, selectedTeam]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const loadProjectTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_project_assignments')
        .select(`
          team_id,
          teams (*)
        `)
        .eq('project_id', selectedProject);

      if (error) throw error;

      const teams = data?.map(assignment => assignment.teams as any).filter(Boolean) || [];
      setProjectTeams(teams);
    } catch (error) {
      console.error('Error loading project teams:', error);
      toast.error('Failed to load project teams');
    }
  };

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Get team members for the selected team
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          users (email, full_name)
        `)
        .eq('team_id', selectedTeam);

      if (teamMembersError) throw teamMembersError;

      const members = teamMembersData?.map(member => ({
        user_email: (member.users as any).email,
        full_name: (member.users as any).full_name,
      })) || [];

      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomShiftEnums = async () => {
    try {
      const { data, error } = await supabase.rpc('get_custom_shift_enums', {
        p_project_id: selectedProject,
        p_team_id: selectedTeam
      });

      if (error) throw error;
      setCustomShiftEnums(data || []);
    } catch (error) {
      console.error('Error loading custom shift enums:', error);
      setCustomShiftEnums([]);
    }
  };

  const loadShiftSchedule = async () => {
    try {
      setLoading(true);
      
      // Get existing shift schedules for the selected project, team, and month
      const { data: shiftSchedules, error } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('team_id', selectedTeam)
        .gte('shift_date', `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`)
        .lt('shift_date', `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`);

      if (error) throw error;

      // Get all days in the selected month
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      });

      // Initialize shift data for all team members
      const initialShiftData: ShiftScheduleData[] = teamMembers.map(member => {
        const shifts: { [date: string]: ShiftType } = {};
        dates.forEach(date => {
          const existingShift = shiftSchedules?.find(s => 
            s.user_email === member.user_email && s.shift_date === date
          );
          
          if (existingShift) {
            shifts[date] = existingShift.shift_type;
          } else {
            // Default logic: weekends = Holiday (H), weekdays = General (G)
            const dayOfWeek = new Date(date).getDay();
            const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
            shifts[date] = isWeekendDay ? 'H' : 'G';
          }
        });
        
        return {
          user_email: member.user_email,
          full_name: member.full_name,
          shifts,
        };
      });

      setShiftData(initialShiftData);
    } catch (error) {
      console.error('Error loading shift schedule:', error);
      toast.error('Failed to load shift schedule');
    } finally {
      setLoading(false);
    }
  };

  const updateShift = (userEmail: string, date: string, shiftType: ShiftType) => {
    setShiftData(prev => 
      prev.map(user => 
        user.user_email === userEmail 
          ? { ...user, shifts: { ...user.shifts, [date]: shiftType } }
          : user
      )
    );
  };

  const saveShiftSchedule = async () => {
    try {
      setSaving(true);
      
      // Prepare all shift data for bulk upsert
      const shiftUpdates: any[] = [];
      shiftData.forEach(user => {
        Object.entries(user.shifts).forEach(([date, shiftType]) => {
          shiftUpdates.push({
            project_id: selectedProject,
            team_id: selectedTeam,
            user_email: user.user_email,
            shift_date: date,
            shift_type: shiftType,
          });
        });
      });

      // Use individual upserts for better reliability
      const promises = shiftUpdates.map(shift => 
        supabase.rpc('upsert_shift_schedules', {
          p_project_id: shift.project_id,
          p_team_id: shift.team_id,
          p_user_email: shift.user_email,
          p_shift_date: shift.shift_date,
          p_shift_type: shift.shift_type
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        console.error('Some shifts failed to save:', errors);
        toast.error(`Failed to save ${errors.length} shifts`);
      } else {
        toast.success('Shift schedule saved successfully!');
      }
    } catch (error) {
      console.error('Error saving shift schedule:', error);
      toast.error('Failed to save shift schedule');
    } finally {
      setSaving(false);
    }
  };

  const downloadCSV = () => {
    if (!shiftData.length) {
      toast.error('No data to download');
      return;
    }

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    });

    // Create CSV header in the same format as the sample file
    const header = ['Email', ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString())].join(',');

    // Create CSV rows
    const rows = shiftData.map(user => {
      const shiftValues = dates.map(date => user.shifts[date] || 'G');
      return [user.user_email, ...shiftValues].join(',');
    });

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift_schedule_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('CSV downloaded successfully!');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (!selectedProject || !selectedTeam) {
      toast.error('Please select a project and team first');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      processCSVUpload(csvData);
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  const processCSVUpload = async (csvData: string) => {
    try {
      setUploading(true);
      
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        toast.error('CSV file must have at least a header and one data row');
        return;
      }

      // Parse header to get day numbers
      const header = lines[0].split(',');
      if (header[0].toLowerCase() !== 'email') {
        toast.error('CSV file must have "Email" as the first column');
        return;
      }

      const dayNumbers = header.slice(1).map(day => parseInt(day.trim()));
      const validDays = dayNumbers.filter(day => day >= 1 && day <= 31);

      if (validDays.length === 0) {
        toast.error('CSV file must have valid day numbers (1-31) in the header');
        return;
      }

      // Get custom shift enums for validation
      const { data: customEnums } = await supabase.rpc('get_custom_shift_enums', {
        p_project_id: selectedProject,
        p_team_id: selectedTeam
      });

      const validShiftIdentifiers = customEnums?.map((enum_: any) => enum_.shift_identifier) || [];
      const defaultShift = customEnums?.find((enum_: any) => enum_.is_default)?.shift_identifier || 'G';

      // Process each data row
      const updatesCount = { updated: 0, skipped: 0, invalidShifts: 0 };
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].trim();
        if (!row) continue;

        const columns = row.split(',');
        const email = columns[0]?.trim();
        
        if (!email) {
          console.warn(`Skipping row ${i + 1}: No email found`);
          updatesCount.skipped++;
          continue;
        }

        // Check if this user exists in current team members
        const userExists = teamMembers.some(member => member.user_email === email);
        if (!userExists) {
          console.warn(`Skipping user ${email}: Not found in selected team`);
          updatesCount.skipped++;
          continue;
        }

        // Process shifts for this user
        for (let dayIndex = 0; dayIndex < validDays.length; dayIndex++) {
          const day = validDays[dayIndex];
          const shiftValue = columns[dayIndex + 1]?.trim().toUpperCase();
          
          // Skip if day is not valid for the selected month
          const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
          if (day > daysInMonth) continue;

          if (shiftValue) {
            const date = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            // Validate shift type against custom enums or default types
            let finalShiftValue = shiftValue;
            if (validShiftIdentifiers.length > 0) {
              // Use custom enums if defined
              if (!validShiftIdentifiers.includes(shiftValue)) {
                finalShiftValue = defaultShift;
                updatesCount.invalidShifts++;
              }
            } else {
              // Use default shift types
              if (!Object.keys(SHIFT_TYPES).includes(shiftValue as ShiftType)) {
                finalShiftValue = 'G';
                updatesCount.invalidShifts++;
              }
            }
            
            // Update local state
            setShiftData(prev => 
              prev.map(user => 
                user.user_email === email 
                  ? { ...user, shifts: { ...user.shifts, [date]: finalShiftValue as ShiftType } }
                  : user
              )
            );

            // Save to database
            await supabase.rpc('upsert_shift_schedules', {
              p_project_id: selectedProject,
              p_team_id: selectedTeam,
              p_user_email: email,
              p_shift_date: date,
              p_shift_type: finalShiftValue as ShiftType
            });

            updatesCount.updated++;
          }
        }
      }

      let message = `CSV uploaded successfully! Updated ${updatesCount.updated} shifts. Skipped ${updatesCount.skipped} invalid entries.`;
      if (updatesCount.invalidShifts > 0) {
        message += ` ${updatesCount.invalidShifts} invalid shifts were replaced with default shift.`;
      }
      
      toast.success(message);
      
      // Reload the schedule to reflect changes
      await loadShiftSchedule();
      
    } catch (error) {
      console.error('Error processing CSV upload:', error);
      toast.error('Failed to process CSV upload');
    } finally {
      setUploading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  };

  const getDayName = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isWeekend = (day: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Dynamic shift types based on custom enums or defaults
  const getShiftTypes = () => {
    if (customShiftEnums.length > 0) {
      // Use custom shift enums
      const shiftTypes: { [key: string]: { label: string; color: string; bgColor: string; customColor?: string; customBgColor?: string; customTextColor?: string } } = {};
      customShiftEnums.forEach(enum_ => {
        const hexColor = enum_.color || '#3B82F6';
        const rgbColor = hexToRgb(hexColor);
        const bgColor = rgbColor ? `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)` : 'rgba(59, 130, 246, 0.1)';
        const textColor = rgbColor ? `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})` : 'rgb(59, 130, 246)';
        
        shiftTypes[enum_.shift_identifier] = {
          label: enum_.shift_name,
          color: 'text-gray-700',
          bgColor: 'bg-blue-100',
          customColor: hexColor,
          customBgColor: bgColor,
          customTextColor: textColor
        };
      });
      return shiftTypes;
    } else {
      // Use default shift types
      return SHIFT_TYPES;
    }
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const currentShiftTypes = getShiftTypes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shift Schedule</h1>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-500">Manage team shift schedules</span>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedTeam('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={!selectedProject}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select Team</option>
              {projectTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month/Year Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month & Year
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex-1 flex items-center justify-center space-x-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => changeMonth('next')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Schedule Table */}
      {selectedProject && selectedTeam && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Shift Schedule - {monthNames[selectedMonth - 1]} {selectedYear}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowShiftEnumModal(true)}
                disabled={!selectedProject || !selectedTeam}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings className="h-4 w-4 mr-1" />
                Manage Shifts
              </button>
              <label className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-all ${
                uploading 
                  ? 'bg-blue-100 text-blue-800 cursor-not-allowed' 
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              } ${(!selectedProject || !selectedTeam) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                {uploading ? 'Processing CSV...' : 'Upload CSV'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploading || !selectedProject || !selectedTeam}
                  className="hidden"
                />
              </label>
              <button
                onClick={downloadCSV}
                disabled={!shiftData.length}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-1" />
                Download CSV
              </button>
              <button
                onClick={saveShiftSchedule}
                disabled={saving || !shiftData.length}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading shift schedule...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      User Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Full Name
                    </th>
                    {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => (
                      <th
                        key={day}
                        className={`px-4 py-4 text-center text-sm font-medium uppercase tracking-wider border border-gray-200 ${
                          isWeekend(day) ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-base">{day}</span>
                          <span className={`text-xs ${isWeekend(day) ? 'text-red-600' : 'text-gray-500'}`}>
                            ({getDayName(day)})
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shiftData.map((user, userIndex) => (
                    <tr key={user.user_email} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                        {user.user_email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.full_name}
                      </td>
                                             {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => {
                         const date = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                         const currentShift = user.shifts[date] || 'G';
                         const shiftConfig = currentShiftTypes[currentShift] || SHIFT_TYPES[currentShift] || SHIFT_TYPES['G'];
                         
                         return (
                                                     <td
                            key={day}
                            className={`px-4 py-4 text-center ${
                              isWeekend(day) ? 'bg-red-50 border-red-100' : 'bg-white'
                            } border border-gray-200`}
                          >
                                                          <select
                                value={currentShift}
                                onChange={(e) => updateShift(user.user_email, date, e.target.value as ShiftType)}
                                className={`w-full min-w-[60px] px-4 py-3 text-base font-bold rounded-md border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none cursor-pointer transition-all appearance-none bg-no-repeat bg-right`}
                                style={{ 
                                  backgroundImage: 'none',
                                  backgroundColor: (shiftConfig as any).customBgColor || shiftConfig.bgColor,
                                  color: (shiftConfig as any).customTextColor || undefined
                                }}
                              >
                              {Object.entries(currentShiftTypes).map(([key, config]) => (
                                <option key={key} value={key} className={`${config.bgColor} ${config.color} font-bold text-base`}>
                                  {key}
                                </option>
                              ))}
                            </select>
                          </td>
                         );
                       })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Shift Type Legend and CSV Upload Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {customShiftEnums.length > 0 ? 'Custom Shift Types' : 'Default Shift Types'}
          </h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
             {Object.entries(currentShiftTypes).map(([key, config]) => (
               <div key={key} className="flex items-center space-x-2">
                                   <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ 
                      backgroundColor: (config as any).customBgColor || config.bgColor 
                    }}
                  ></div>
                 <span className="text-sm text-gray-700">
                   <span className="font-medium">{key}:</span> {config.label}
                 </span>
               </div>
             ))}
           </div>
          {customShiftEnums.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Click "Manage Shifts" to create custom shift types for this project-team combination.
            </p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">CSV Upload Format</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><span className="font-medium">Header:</span> Email,1,2,3,4,5,...,31</p>
            <p><span className="font-medium">Data:</span> user@example.com,G,M,A,N,H,L,...</p>
            <div className="mt-2 text-xs">
              <p className="text-gray-500">• Only updates specified users and dates</p>
              <p className="text-gray-500">• Preserves existing shifts for unmentioned users/dates</p>
              <p className="text-gray-500">• Users must be members of the selected team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Enum Management Modal */}
      {selectedProject && selectedTeam && (
        <ShiftEnumModal
          key={`${selectedProject}-${selectedTeam}-${customShiftEnums.length}`}
          isOpen={showShiftEnumModal}
          onClose={() => {
            setShowShiftEnumModal(false);
            // Force refresh of data when modal closes
            setTimeout(() => {
              loadCustomShiftEnums();
            }, 100);
          }}
          projectId={selectedProject}
          teamId={selectedTeam}
          projectName={projects.find(p => p.id === selectedProject)?.name || ''}
          teamName={projectTeams.find(t => t.id === selectedTeam)?.name || ''}
          onShiftsUpdated={() => {
            loadShiftSchedule();
            loadCustomShiftEnums();
          }}
        />
      )}
    </div>
  );
}
