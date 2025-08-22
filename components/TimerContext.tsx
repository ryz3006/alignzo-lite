'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabaseClient } from '@/lib/supabase-client';
import { Timer, Project, ProjectCategory } from '@/lib/supabase';
import { formatDuration } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TimerContextType {
  timers: Timer[];
  activeTimers: Timer[];
  startTimer: (timerData: Partial<Timer>) => Promise<void>;
  pauseTimer: (timerId: string) => Promise<void>;
  resumeTimer: (timerId: string) => Promise<void>;
  stopTimer: (timerId: string) => Promise<void>;
  loadTimers: () => Promise<void>;
  getTimerDuration: (timer: Timer) => string;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [activeTimers, setActiveTimers] = useState<Timer[]>([]);

  useEffect(() => {
    loadTimers();
    // Note: Real-time subscriptions are not supported through the proxy
    // We'll implement polling instead for now
    const interval = setInterval(() => {
      loadTimers();
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadTimers = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      const response = await supabaseClient.get('timers', {
        select: '*',
        filters: { user_email: currentUser.email },
        order: { column: 'created_at', ascending: false }
      });

      if (response.error) throw new Error(response.error);

      const timersData = response.data || [];
      setTimers(timersData);
      setActiveTimers(timersData.filter((timer: any) => timer.is_running || timer.is_paused));
    } catch (error) {
      console.error('Error loading timers:', error);
    }
  };

  const startTimer = async (timerData: Partial<Timer>) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) throw new Error('User not authenticated');

      const newTimer: Partial<Timer> = {
        user_email: currentUser.email,
        project_id: timerData.project_id!,
        ticket_id: timerData.ticket_id!,
        task_detail: timerData.task_detail!,
        dynamic_category_selections: timerData.dynamic_category_selections || {},
        start_time: new Date().toISOString(),
        is_running: true,
        is_paused: false,
        total_pause_duration_seconds: 0,
      };

      const response = await supabaseClient.insert('timers', newTimer);

      if (response.error) throw new Error(response.error);

      toast.success('Timer started successfully');
      await loadTimers();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      toast.error(error.message || 'Failed to start timer');
    }
  };

  const pauseTimer = async (timerId: string) => {
    try {
      const response = await supabaseClient.update('timers', timerId, {
        is_running: false,
        is_paused: true,
        pause_start_time: new Date().toISOString()
      });

      if (response.error) throw new Error(response.error);

      toast.success('Timer paused');
      await loadTimers();
    } catch (error: any) {
      console.error('Error pausing timer:', error);
      toast.error(error.message || 'Failed to pause timer');
    }
  };

  const resumeTimer = async (timerId: string) => {
    try {
      const timer = timers.find(t => t.id === timerId);
      if (!timer) throw new Error('Timer not found');

      const now = new Date();
      const pauseStart = timer.pause_start_time ? new Date(timer.pause_start_time) : now;
      const pauseDuration = Math.floor((now.getTime() - pauseStart.getTime()) / 1000);

      const response = await supabaseClient.update('timers', timerId, {
        is_running: true,
        is_paused: false,
        pause_start_time: null,
        total_pause_duration_seconds: (timer.total_pause_duration_seconds || 0) + pauseDuration
      });

      if (response.error) throw new Error(response.error);

      toast.success('Timer resumed');
      await loadTimers();
    } catch (error: any) {
      console.error('Error resuming timer:', error);
      toast.error(error.message || 'Failed to resume timer');
    }
  };

  const stopTimer = async (timerId: string) => {
    try {
      const timer = timers.find(t => t.id === timerId);
      if (!timer) throw new Error('Timer not found');

      const now = new Date();
      const startTime = new Date(timer.start_time);
      const totalDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const netDuration = totalDuration - (timer.total_pause_duration_seconds || 0);

      const response = await supabaseClient.update('timers', timerId, {
        is_running: false,
        is_paused: false,
        end_time: now.toISOString()
      });

      if (response.error) throw new Error(response.error);

      // Create work log entry
      await supabaseClient.insert('work_logs', {
        user_email: timer.user_email,
        project_id: timer.project_id,
        ticket_id: timer.ticket_id,
        task_detail: timer.task_detail,
        dynamic_category_selections: timer.dynamic_category_selections || {},
        start_time: timer.start_time,
        end_time: now.toISOString(),
        total_pause_duration_seconds: timer.total_pause_duration_seconds || 0,
        logged_duration_seconds: netDuration
      });

      toast.success('Timer stopped and work logged');
      await loadTimers();
    } catch (error: any) {
      console.error('Error stopping timer:', error);
      toast.error(error.message || 'Failed to stop timer');
    }
  };

  const getTimerDuration = (timer: Timer): string => {
    const now = new Date();
    const startTime = new Date(timer.start_time);
    let totalDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    // If timer is currently paused, calculate duration up to pause time
    if (timer.is_paused && timer.pause_start_time) {
      const pauseTime = new Date(timer.pause_start_time);
      totalDuration = Math.floor((pauseTime.getTime() - startTime.getTime()) / 1000);
    }
    
    const loggedDuration = totalDuration - (timer.total_pause_duration_seconds || 0);
    return formatDuration(Math.max(0, loggedDuration));
  };

  const value: TimerContextType = {
    timers,
    activeTimers,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    loadTimers,
    getTimerDuration,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
