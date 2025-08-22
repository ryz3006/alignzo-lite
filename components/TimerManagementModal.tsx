'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Timer, Project } from '@/lib/supabase';
import { useTimer } from './TimerContext';
import { X, Play, Pause, Square, Clock, Timer as TimerIcon, AlertCircle } from 'lucide-react';
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
              <TimerIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Active Timers
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Manage your running timers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTimers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No Active Timers
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Start a timer to track your work progress
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTimers.map((timer) => (
                <div key={timer.id} className="card border border-neutral-200 dark:border-neutral-700">
                  <div className="p-6">
                    {/* Timer Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {getProjectName(timer.project_id)}
                          </h4>
                          {timer.is_paused && (
                            <span className="badge badge-warning">
                              Paused
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="font-medium">Ticket:</span> {timer.ticket_id}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {timer.task_detail}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-500">
                            Started: {formatDateTime(timer.start_time)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Timer Display */}
                      <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-primary-600 dark:text-primary-400 mb-1">
                          {timerDurations[timer.id] || '00:00:00'}
                        </div>
                        <div className="flex items-center justify-end space-x-1">
                          <div className={`w-2 h-2 rounded-full ${timer.is_paused ? 'bg-warning-500' : 'bg-success-500 animate-pulse'}`}></div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-500">
                            {timer.is_paused ? 'Paused' : 'Running'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3 mb-4">
                      {timer.is_paused ? (
                        <button
                          onClick={() => handleResume(timer.id)}
                          className="btn-success flex items-center space-x-2"
                        >
                          <Play className="h-4 w-4" />
                          <span>Resume</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePause(timer.id)}
                          className="btn-warning flex items-center space-x-2"
                        >
                          <Pause className="h-4 w-4" />
                          <span>Pause</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleStop(timer.id)}
                        className="btn-danger flex items-center space-x-2"
                      >
                        <Square className="h-4 w-4" />
                        <span>Stop</span>
                      </button>
                    </div>

                    {/* Dynamic Categories Display */}
                    {Object.keys(timer.dynamic_category_selections || {}).length > 0 && (
                      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center space-x-2 mb-3">
                          <AlertCircle className="h-4 w-4 text-neutral-500" />
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Categories
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(timer.dynamic_category_selections || {}).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-700">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {activeTimers.length} active timer{activeTimers.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
