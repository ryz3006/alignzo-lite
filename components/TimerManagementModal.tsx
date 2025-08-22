'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Timer, Project } from '@/lib/supabase';
import { useTimer } from './TimerContext';
import { X, Play, Pause, Square, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface TimerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TimerManagementModal({ isOpen, onClose }: TimerManagementModalProps) {
  const { activeTimers, pauseTimer, resumeTimer, stopTimer, getTimerDuration } = useTimer();
  const [projects, setProjects] = useState<Project[]>([]);
  const [timerDurations, setTimerDurations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTimers.length > 0) {
      // Update timer durations every second
      const interval = setInterval(() => {
        const durations: Record<string, string> = {};
        activeTimers.forEach(timer => {
          durations[timer.id] = getTimerDuration(timer);
        });
        setTimerDurations(durations);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, activeTimers, getTimerDuration]);

  const loadProjects = async () => {
    try {
      const response = await supabaseClient.get('projects', {
        select: '*'
      });

      if (response.error) throw new Error(response.error);
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const handlePause = async (timerId: string) => {
    await pauseTimer(timerId);
  };

  const handleResume = async (timerId: string) => {
    await resumeTimer(timerId);
  };

  const handleStop = async (timerId: string) => {
    await stopTimer(timerId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Active Timers</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {activeTimers.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No active timers</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTimers.map((timer) => (
              <div key={timer.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {getProjectName(timer.project_id)}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Ticket: {timer.ticket_id}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {timer.task_detail}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Started: {formatDateTime(timer.start_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono text-gray-900">
                      {timerDurations[timer.id] || '00:00:00'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {timer.is_paused ? 'Paused' : 'Running'}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {timer.is_paused ? (
                    <button
                      onClick={() => handleResume(timer.id)}
                      className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePause(timer.id)}
                      className="flex items-center px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => handleStop(timer.id)}
                    className="flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Stop
                  </button>
                </div>

                {/* Dynamic Categories Display */}
                {Object.keys(timer.dynamic_category_selections || {}).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Categories:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(timer.dynamic_category_selections || {}).map(([key, value]) => (
                        <span
                          key={key}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
