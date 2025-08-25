'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Project, ProjectCategory, Team, TeamProjectAssignment } from '@/lib/supabase';
import { Plus, Edit, Trash2, Search, Settings, X, Users, Grid3X3 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectWithCategories extends Project {
  categories: ProjectCategory[];
  categoryCount: number;
  assignedTeams: Team[];
  teamCount: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithCategories[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showSubcategoriesModal, setShowSubcategoriesModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWithCategories | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    product: '',
    country: '',
  });
  const [categories, setCategories] = useState<{ name: string; options: string[]; description?: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ name: string; category_id: string; description?: string }[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  useEffect(() => {
    loadProjects();
    loadTeams();
  }, []);

  const loadProjects = async () => {
    try {
      // Get projects
      const projectsResponse = await supabaseClient.get('projects', {
        order: { column: 'created_at', ascending: false }
      });

      if (projectsResponse.error) {
        console.error('Error loading projects:', projectsResponse.error);
        throw new Error(projectsResponse.error);
      }

      // Get project categories
      const categoriesResponse = await supabaseClient.get('project_categories', {
        order: { column: 'created_at', ascending: true }
      });

      if (categoriesResponse.error) {
        console.error('Error loading project categories:', categoriesResponse.error);
        throw new Error(categoriesResponse.error);
      }

      // Get team-project assignments
      const assignmentsResponse = await supabaseClient.get('team_project_assignments', {
        select: '*,teams(*)'
      });

      if (assignmentsResponse.error) {
        console.error('Error loading team assignments:', assignmentsResponse.error);
        throw new Error(assignmentsResponse.error);
      }

      const projectsData = projectsResponse.data || [];
      const categoriesData = categoriesResponse.data || [];
      const assignmentsData = assignmentsResponse.data || [];

      // Combine projects with their categories and teams
      const projectsWithCategories = projectsData.map((project: any) => {
        const projectCategories = categoriesData.filter((cat: any) => cat.project_id === project.id) || [];
        const projectAssignments = assignmentsData.filter((assignment: any) => assignment.project_id === project.id) || [];
        const assignedTeams = projectAssignments.map((assignment: any) => assignment.teams).filter(Boolean) as Team[];
        
        return {
          ...project,
          categories: projectCategories,
          categoryCount: projectCategories.length,
          assignedTeams: assignedTeams,
          teamCount: assignedTeams.length,
        };
      });

      setProjects(projectsWithCategories);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await supabaseClient.get('teams', { select: '*' });

      if (response.error) {
        console.error('Error loading teams:', response.error);
        throw new Error(response.error);
      }
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProject) {
        // Update existing project
        const response = await supabaseClient.update('projects', editingProject.id, formData);

        if (response.error) {
          console.error('Error updating project:', response.error);
          throw new Error(response.error);
        }
        toast.success('Project updated successfully');
      } else {
        // Create new project
        const response = await supabaseClient.insert('projects', formData);

        if (response.error) {
          console.error('Error creating project:', response.error);
          throw new Error(response.error);
        }
        toast.success('Project created successfully');
      }

      setShowModal(false);
      setEditingProject(null);
      setFormData({ name: '', product: '', country: '' });
      loadProjects();
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast.error(error.message || 'Failed to save project');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      product: project.product,
      country: project.country,
    });
    setShowModal(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await supabaseClient.delete('projects', projectId);

      if (response.error) {
        console.error('Error deleting project:', response.error);
        throw new Error(response.error);
      }
      toast.success('Project deleted successfully');
      loadProjects();
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Failed to delete project');
    }
  };

  const handleManageCategories = async (project: ProjectWithCategories) => {
    setSelectedProject(project);
    
    try {
      // Load categories with their options using the admin API
      const response = await fetch(`/api/admin/categories?projectId=${project.id}`);
      
      if (response.ok) {
        const result = await response.json();
        const categoriesWithOptions = (result.data || []).map((category: any) => ({
          name: category.name,
          options: (category.category_options || []).map((opt: any) => opt.option_value),
          description: category.description || ''
        }));
        
        setCategories(categoriesWithOptions);
        setShowCategoriesModal(true);
      } else {
        // Fallback to the old method if admin API fails
        console.warn('Admin API failed, falling back to old method');
        const categoriesWithOptions = [];
        
        for (const category of project.categories) {
          // Fetch options for this category
          const optionsResponse = await fetch(`/api/categories/options?categoryId=${category.id}`);
          
          if (optionsResponse.ok) {
            const options = await optionsResponse.json();
            categoriesWithOptions.push({
              name: category.name,
              options: options.map((opt: any) => opt.option_value),
              description: category.description || ''
            });
          } else {
            // Fallback to parsing from description if API fails
            let options: string[] = [];
            if (category.description && category.description.includes('Category with options:')) {
              const optionsMatch = category.description.match(/Category with options: (.+)/);
              if (optionsMatch) {
                options = optionsMatch[1].split(', ').map(opt => opt.trim());
              }
            }
            
            categoriesWithOptions.push({
              name: category.name,
              options: options.length > 0 ? options : [''],
              description: category.description || ''
            });
          }
        }
        
        setCategories(categoriesWithOptions);
        setShowCategoriesModal(true);
      }
    } catch (error) {
      console.error('Error loading categories with options:', error);
      toast.error('Failed to load category options');
      
      // Fallback to the old method
      const projectCategories = project.categories.map(cat => {
        let options: string[] = [];
        if (cat.description && cat.description.includes('Category with options:')) {
          const optionsMatch = cat.description.match(/Category with options: (.+)/);
          if (optionsMatch) {
            options = optionsMatch[1].split(', ').map(opt => opt.trim());
          }
        }
        
        return {
          name: cat.name,
          options: options.length > 0 ? options : [''],
        };
      });
      setCategories(projectCategories);
      setShowCategoriesModal(true);
    }
  };

  const handleManageSubcategories = (project: ProjectWithCategories) => {
    setSelectedProject(project);
    // Load subcategories for this project
    loadProjectSubcategories(project.id);
    setShowSubcategoriesModal(true);
  };

  const loadProjectSubcategories = async (projectId: string) => {
    try {
      const response = await supabaseClient.get('project_subcategories', {
        select: '*,project_categories(name)',
        filters: { 'project_categories.project_id': projectId }
      });

      if (response.error) {
        console.error('Error loading subcategories:', response.error);
        return;
      }

      const subcategoriesData = response.data?.map((sub: any) => ({
        name: sub.name,
        category_id: sub.category_id,
        description: sub.description || ''
      })) || [];

      setSubcategories(subcategoriesData);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const handleManageTeams = (project: ProjectWithCategories) => {
    setSelectedProject(project);
    setSelectedTeams(project.assignedTeams.map(team => team.id));
    setShowTeamsModal(true);
  };

  const handleUpdateCategories = async () => {
    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }

    if (!selectedProject.id) {
      toast.error('Selected project has no valid ID');
      console.error('Selected project:', selectedProject);
      return;
    }

    // Validate categories before sending
    const validCategories = categories.filter(cat => 
      cat.name && cat.name.trim() !== '' && 
      cat.options && cat.options.length > 0 && 
      cat.options.every(option => option && option.trim() !== '')
    );

    if (validCategories.length === 0) {
      toast.error('Please add at least one category with a name and options');
      return;
    }

    try {
      console.log('Updating categories for project:', selectedProject.id);
      console.log('Selected project object:', selectedProject);
      console.log('Categories to insert:', validCategories);

      // Use the dedicated admin API endpoint
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          categories: validCategories
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Admin API error:', errorData);
        throw new Error(errorData.error || 'Failed to update categories');
      }

      const result = await response.json();
      console.log('Admin API success:', result);

      toast.success('Project categories updated successfully');
      setShowCategoriesModal(false);
      setSelectedProject(null);
      setCategories([]);
      loadProjects();
    } catch (error: any) {
      console.error('Error updating project categories:', error);
      toast.error(error.message || 'Failed to update project categories');
    }
  };

  const handleUpdateTeams = async () => {
    if (!selectedProject) return;

    try {
      // Remove all current team assignments
      const deleteResponse = await supabaseClient.query({
        table: 'team_project_assignments',
        action: 'delete',
        filters: { project_id: selectedProject.id }
      });

      if (deleteResponse.error) {
        console.error('Error deleting team assignments:', deleteResponse.error);
        throw new Error(deleteResponse.error);
      }

      // Add new team assignments
      if (selectedTeams.length > 0) {
        const newAssignments = selectedTeams.map(teamId => ({
          project_id: selectedProject.id,
          team_id: teamId,
        }));

        const insertResponse = await supabaseClient.insert('team_project_assignments', newAssignments);

        if (insertResponse.error) {
          console.error('Error inserting team assignments:', insertResponse.error);
          throw new Error(insertResponse.error);
        }
      }

      toast.success('Project teams updated successfully');
      setShowTeamsModal(false);
      setSelectedProject(null);
      setSelectedTeams([]);
      loadProjects();
    } catch (error: any) {
      console.error('Error updating project teams:', error);
      toast.error(error.message || 'Failed to update project teams');
    }
  };

  const addCategory = () => {
    setCategories([...categories, { name: '', options: [''] }]);
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: 'name' | 'options', value: any) => {
    const updatedCategories = [...categories];
    if (field === 'name') {
      updatedCategories[index].name = value;
    } else {
      updatedCategories[index].options = value;
    }
    setCategories(updatedCategories);
  };

  const addOption = (categoryIndex: number) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].options.push('');
    setCategories(updatedCategories);
  };

  const removeOption = (categoryIndex: number, optionIndex: number) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].options.splice(optionIndex, 1);
    setCategories(updatedCategories);
  };

  const updateOption = (categoryIndex: number, optionIndex: number, value: string) => {
    const updatedCategories = [...categories];
    updatedCategories[categoryIndex].options[optionIndex] = value;
    setCategories(updatedCategories);
  };

  const addSubcategory = () => {
    setSubcategories([...subcategories, { name: '', category_id: '', description: '' }]);
  };

  const removeSubcategory = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  const updateSubcategory = (index: number, field: 'name' | 'category_id' | 'description', value: string) => {
    const updatedSubcategories = [...subcategories];
    updatedSubcategories[index] = { ...updatedSubcategories[index], [field]: value };
    setSubcategories(updatedSubcategories);
  };

  const handleUpdateSubcategories = async () => {
    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }

    // Validate subcategories before sending
    const validSubcategories = subcategories.filter(sub => 
      sub.name && sub.name.trim() !== '' && 
      sub.category_id && sub.category_id.trim() !== ''
    );

    if (validSubcategories.length === 0) {
      toast.error('Please add at least one subcategory with a name and category');
      return;
    }

    try {
      console.log('Updating subcategories for project:', selectedProject.id);
      console.log('Subcategories to insert:', validSubcategories);

      // Remove all current subcategories for this project
      const deleteResponse = await supabaseClient.query({
        table: 'project_subcategories',
        action: 'delete',
        filters: { 'project_categories.project_id': selectedProject.id }
      });

      if (deleteResponse.error) {
        console.error('Error deleting project subcategories:', deleteResponse.error);
        throw new Error(deleteResponse.error);
      }

      // Add new subcategories
      const newSubcategories = validSubcategories.map(sub => ({
        category_id: sub.category_id,
        name: sub.name.trim(),
        description: sub.description?.trim() || '',
      }));

      console.log('Final subcategories to insert:', newSubcategories);

      const insertResponse = await supabaseClient.insert('project_subcategories', newSubcategories);

      if (insertResponse.error) {
        console.error('Error inserting project subcategories:', insertResponse.error);
        throw new Error(insertResponse.error);
      }

      toast.success('Project subcategories updated successfully');
      setShowSubcategoriesModal(false);
      setSelectedProject(null);
      setSubcategories([]);
      loadProjects();
    } catch (error: any) {
      console.error('Error updating project subcategories:', error);
      toast.error(error.message || 'Failed to update project subcategories');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage projects and their categories</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Categories
               </th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Teams
               </th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Created
               </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {project.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{project.product}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{project.country}</div>
                </td>
                                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                     <Settings className="h-4 w-4 text-gray-400 mr-2" />
                     <span className="text-sm text-gray-900">{project.categoryCount} categories</span>
                   </div>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center">
                     <Users className="h-4 w-4 text-gray-400 mr-2" />
                     <span className="text-sm text-gray-900">{project.teamCount} teams</span>
                   </div>
                 </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                   <button
                     onClick={() => handleManageTeams(project)}
                     className="text-primary-600 hover:text-primary-900 mr-4"
                     title="Manage Teams"
                   >
                     <Users className="h-4 w-4" />
                   </button>
                   <button
                     onClick={() => handleManageCategories(project)}
                     className="text-primary-600 hover:text-primary-900 mr-4"
                     title="Manage Categories"
                   >
                     <Settings className="h-4 w-4" />
                   </button>
                   <button
                     onClick={() => handleManageSubcategories(project)}
                     className="text-primary-600 hover:text-primary-900 mr-4"
                     title="Manage Subcategories"
                   >
                     <Grid3X3 className="h-4 w-4" />
                   </button>
                   <button
                     onClick={() => handleEdit(project)}
                     className="text-primary-600 hover:text-primary-900 mr-4"
                   >
                     <Edit className="h-4 w-4" />
                   </button>
                   <button
                     onClick={() => handleDelete(project.id)}
                     className="text-red-600 hover:text-red-900"
                   >
                     <Trash2 className="h-4 w-4" />
                   </button>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProject ? 'Edit Project' : 'Add Project'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProject(null);
                      setFormData({ name: '', product: '', country: '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    {editingProject ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategoriesModal && selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Manage Categories - {selectedProject.name}
              </h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        placeholder="Category name (e.g., Work Type, Module)"
                        value={category.name}
                        onChange={(e) => updateCategory(categoryIndex, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeCategory(categoryIndex)}
                        className="ml-2 p-2 text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Options:
                      </label>
                      {category.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center">
                          <input
                            type="text"
                            placeholder="Option value"
                            value={option}
                            onChange={(e) => updateOption(categoryIndex, optionIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(categoryIndex, optionIndex)}
                            className="ml-2 p-2 text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(categoryIndex)}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addCategory}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-primary-500 hover:text-primary-600"
                >
                  + Add Category
                </button>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCategoriesModal(false);
                    setSelectedProject(null);
                    setCategories([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCategories}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Update Categories
                </button>
              </div>
            </div>
          </div>
                 </div>
       )}

       {/* Teams Modal */}
       {showTeamsModal && selectedProject && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <h3 className="text-lg font-medium text-gray-900 mb-4">
                 Manage Teams - {selectedProject.name}
               </h3>
               
               <div className="space-y-3 max-h-64 overflow-y-auto">
                 {teams.map((team) => (
                   <div key={team.id} className="flex items-center">
                     <input
                       type="checkbox"
                       id={`team-${team.id}`}
                       checked={selectedTeams.includes(team.id)}
                       onChange={(e) => {
                         if (e.target.checked) {
                           setSelectedTeams([...selectedTeams, team.id]);
                         } else {
                           setSelectedTeams(selectedTeams.filter(id => id !== team.id));
                         }
                       }}
                       className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                     />
                     <label htmlFor={`team-${team.id}`} className="ml-2 text-sm text-gray-900">
                       {team.name}
                     </label>
                   </div>
                 ))}
               </div>

               <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                 <button
                   onClick={() => {
                     setShowTeamsModal(false);
                     setSelectedProject(null);
                     setSelectedTeams([]);
                   }}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleUpdateTeams}
                   className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                 >
                   Update Teams
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Subcategories Modal */}
       {showSubcategoriesModal && selectedProject && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <h3 className="text-lg font-medium text-gray-900 mb-4">
                 Manage Subcategories - {selectedProject.name}
               </h3>
               
               <div className="space-y-4 max-h-64 overflow-y-auto">
                 {subcategories.map((subcategory, index) => (
                   <div key={index} className="border border-gray-200 rounded-md p-3">
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-sm font-medium text-gray-700">Subcategory {index + 1}</span>
                       <button
                         type="button"
                         onClick={() => removeSubcategory(index)}
                         className="text-red-600 hover:text-red-800"
                       >
                         <X className="h-4 w-4" />
                       </button>
                     </div>
                     
                     <div className="space-y-2">
                       <input
                         type="text"
                         placeholder="Subcategory name"
                         value={subcategory.name}
                         onChange={(e) => updateSubcategory(index, 'name', e.target.value)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                       />
                       
                       <select
                         value={subcategory.category_id}
                         onChange={(e) => updateSubcategory(index, 'category_id', e.target.value)}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                       >
                         <option value="">Select Category</option>
                         {selectedProject.categories.map(category => (
                           <option key={category.id} value={category.id}>
                             {category.name}
                           </option>
                         ))}
                       </select>
                       
                       <textarea
                         placeholder="Description (optional)"
                         value={subcategory.description || ''}
                         onChange={(e) => updateSubcategory(index, 'description', e.target.value)}
                         rows={2}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                       />
                     </div>
                   </div>
                 ))}
                 
                 <button
                   type="button"
                   onClick={addSubcategory}
                   className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-primary-500 hover:text-primary-600"
                 >
                   + Add Subcategory
                 </button>
               </div>

               <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                 <button
                   onClick={() => {
                     setShowSubcategoriesModal(false);
                     setSelectedProject(null);
                     setSubcategories([]);
                   }}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleUpdateSubcategories}
                   className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                 >
                   Update Subcategories
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
