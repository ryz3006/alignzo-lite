'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Project, ProjectCategory, TeamProjectAssignment } from '@/lib/supabase';
import { useTimer } from './TimerContext';
import { getCurrentUser } from '@/lib/auth';
import { X, Play } from 'lucide-react';
import toast from 'react-hot-toast';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TimerModal({ isOpen, onClose }: TimerModalProps) {
  const { startTimer } = useTimer();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [formData, setFormData] = useState({
    ticket_id: '',
    task_detail: '',
    dynamic_category_selections: {} as Record<string, string>,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedProject) {
      loadProjectCategories(selectedProject);
    } else {
      setProjectCategories([]);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // Get user's team memberships
      const teamResponse = await supabaseClient.get('team_members', {
        select: 'team_id,users!inner(*)',
        filters: { 'users.email': currentUser.email }
      });

      if (teamResponse.error) throw new Error(teamResponse.error);

      // Get projects assigned to user's teams
      const userTeamIds = teamResponse.data?.map((membership: any) => membership.team_id) || [];
      
      if (userTeamIds.length > 0) {
        // Get projects assigned to user's teams
        const assignedResponse = await supabaseClient.get('team_project_assignments', {
          select: 'project_id,projects(*)',
          filters: { team_id: userTeamIds }
        });

        if (assignedResponse.error) throw new Error(assignedResponse.error);

        const projectIds = assignedResponse.data?.map((assignment: TeamProjectAssignment) => assignment.project_id) || [];
        
        if (projectIds.length > 0) {
          const response = await supabaseClient.get('projects', {
            select: '*',
            filters: { id: projectIds },
            order: { column: 'name', ascending: true }
          });
          if (response.error) throw new Error(response.error);
          setProjects(response.data || []);
        } else {
          setProjects([]);
        }
      } else {
        // If user is not in any teams, show all projects (fallback)
        const response = await supabaseClient.get('projects', {
          select: '*',
          order: { column: 'name', ascending: true }
        });
        if (response.error) throw new Error(response.error);
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadProjectCategories = async (projectId: string) => {
    try {
      // Use the new API endpoint to get categories with options
      const response = await fetch(`/api/categories/project-options?projectId=${projectId}`);
      
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match the expected format
        const categoriesWithOptions = data.categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          project_id: projectId,
          sort_order: cat.sort_order || 0,
          is_active: cat.is_active !== false,
          color: cat.color,
          options: (cat.options || []).map((opt: any) => ({
            id: opt.id,
            category_id: cat.id,
            option_name: opt.option_name,
            option_value: opt.option_value,
            sort_order: opt.sort_order || 0,
            is_active: opt.is_active !== false
          }))
        }));
        setProjectCategories(categoriesWithOptions);
      } else {
        // Fallback to the old method
        const response = await supabaseClient.get('project_categories', {
          select: '*',
          filters: { project_id: projectId }
        });

        if (response.error) throw new Error(response.error);
        setProjectCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error loading project categories:', error);
      toast.error('Failed to load project categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    if (!formData.ticket_id.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }

    if (!formData.task_detail.trim()) {
      toast.error('Please enter task details');
      return;
    }

    setLoading(true);

    try {
      await startTimer({
        project_id: selectedProject,
        ticket_id: formData.ticket_id,
        task_detail: formData.task_detail,
        dynamic_category_selections: formData.dynamic_category_selections,
      });

      // Reset form
      setFormData({
        ticket_id: '',
        task_detail: '',
        dynamic_category_selections: {},
      });
      setSelectedProject('');
      onClose();
    } catch (error) {
      console.error('Error starting timer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dynamic_category_selections: {
        ...prev.dynamic_category_selections,
        [categoryName]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Start New Timer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              required
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ticket ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticket ID *
            </label>
            <input
              type="text"
              required
              value={formData.ticket_id}
              onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
              placeholder="e.g., TASK-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Task Detail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Detail *
            </label>
            <textarea
              required
              rows={3}
              maxLength={600}
              value={formData.task_detail}
              onChange={(e) => setFormData({ ...formData, task_detail: e.target.value })}
              placeholder="Describe what you're working on..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.task_detail.length}/600 characters
            </div>
          </div>

          {/* Dynamic Categories */}
          {projectCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="space-y-3">
                {projectCategories.map((category) => (
                  <div key={category.id}>
                    <label className="block text-sm text-gray-600 mb-1">
                      {category.name}
                    </label>
                    <select
                      value={formData.dynamic_category_selections[category.name] || ''}
                      onChange={(e) => handleCategoryChange(category.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select {category.name}</option>
                      {category.options?.map((option) => (
                        <option key={option.id} value={option.option_value}>
                          {option.option_name}
                        </option>
                      )) || []}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Starting...' : 'Start Timer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
