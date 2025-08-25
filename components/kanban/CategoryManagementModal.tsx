'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Trash2, Palette, Settings } from 'lucide-react';
import { ProjectWithCategories, ProjectCategory, ProjectSubcategory, CreateCategoryForm, CreateSubcategoryForm } from '@/lib/kanban-types';
import { createProjectCategory, updateProjectCategory, deleteProjectCategory, createProjectSubcategory } from '@/lib/kanban-api';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectWithCategories;
  onUpdate: () => void;
}

export default function CategoryManagementModal({
  isOpen,
  onClose,
  projectData,
  onUpdate
}: CategoryManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateSubcategory, setShowCreateSubcategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<ProjectSubcategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState<CreateCategoryForm>({
    name: '',
    description: '',
    color: '#3B82F6',
    sort_order: 0
  });

  const [subcategoryForm, setSubcategoryForm] = useState<CreateSubcategoryForm>({
    name: '',
    description: '',
    color: '#6B7280',
    sort_order: 0
  });

  const [errors, setErrors] = useState<any>({});

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  useEffect(() => {
    if (projectData.categories.length > 0) {
      setSelectedCategory(projectData.categories[0]);
    }
  }, [projectData]);

  const validateCategoryForm = (): boolean => {
    const newErrors: any = {};

    if (!categoryForm.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!categoryForm.color) {
      newErrors.color = 'Color is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSubcategoryForm = (): boolean => {
    const newErrors: any = {};

    if (!subcategoryForm.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!selectedCategory) {
      newErrors.category = 'Please select a category first';
    }

    if (!subcategoryForm.color) {
      newErrors.color = 'Color is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCategory = async () => {
    if (!validateCategoryForm()) return;

    try {
      const response = await createProjectCategory(projectData.id, categoryForm);
      if (response.success) {
        setShowCreateCategory(false);
        setCategoryForm({ name: '', description: '', color: '#3B82F6', sort_order: 0 });
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!validateSubcategoryForm()) return;

    try {
      const response = await createProjectSubcategory(selectedCategory!.id, subcategoryForm);
      if (response.success) {
        setShowCreateSubcategory(false);
        setSubcategoryForm({ name: '', description: '', color: '#6B7280', sort_order: 0 });
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating subcategory:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !validateCategoryForm()) return;

    try {
      const response = await updateProjectCategory(editingCategory.id, categoryForm);
      if (response.success) {
        setEditingCategory(null);
        setCategoryForm({ name: '', description: '', color: '#3B82F6', sort_order: 0 });
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete all associated subcategories.')) {
      return;
    }

    try {
      const response = await deleteProjectCategory(categoryId);
      if (response.success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const openEditCategory = (category: ProjectCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color,
      sort_order: category.sort_order
    });
  };

  const openCreateCategory = () => {
    setShowCreateCategory(true);
    setCategoryForm({ name: '', description: '', color: '#3B82F6', sort_order: 0 });
    setErrors({});
  };

  const openCreateSubcategory = () => {
    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }
    setShowCreateSubcategory(true);
    setSubcategoryForm({ name: '', description: '', color: '#6B7280', sort_order: 0 });
    setErrors({});
  };

  const resetForms = () => {
    setShowCreateCategory(false);
    setShowCreateSubcategory(false);
    setEditingCategory(null);
    setEditingSubcategory(null);
    setCategoryForm({ name: '', description: '', color: '#3B82F6', sort_order: 0 });
    setSubcategoryForm({ name: '', description: '', color: '#6B7280', sort_order: 0 });
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Category Management
          </h2>
          <button
            onClick={() => {
              resetForms();
              onClose();
            }}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'categories', label: 'Categories' },
              { id: 'subcategories', label: 'Subcategories' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Categories Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Project Categories
                </h3>
                <button
                  onClick={openCreateCategory}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Category
                </button>
              </div>

              {/* Categories List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectData.categories.map((category) => (
                  <div key={category.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <h4 className="font-medium text-neutral-900 dark:text-white">
                          {category.name}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditCategory(category)}
                          className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {category.description && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        {category.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span>Order: {category.sort_order}</span>
                      <span>Color: {category.color}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Create/Edit Category Modal */}
              {(showCreateCategory || editingCategory) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                        {editingCategory ? 'Edit Category' : 'New Category'}
                      </h3>
                      <button
                        onClick={() => {
                          setShowCreateCategory(false);
                          setEditingCategory(null);
                          resetForms();
                        }}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (editingCategory) {
                        handleUpdateCategory();
                      } else {
                        handleCreateCategory();
                      }
                    }} className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.name 
                              ? 'border-red-300 focus:ring-red-500' 
                              : 'border-neutral-300 dark:border-neutral-600'
                          } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                          placeholder="Category name"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                          placeholder="Category description"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Color *
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                categoryForm.color === color 
                                  ? 'border-neutral-900 dark:border-white scale-110' 
                                  : 'border-neutral-300 dark:border-neutral-600 hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {errors.color && (
                          <p className="mt-1 text-sm text-red-600">{errors.color}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={categoryForm.sort_order}
                          onChange={(e) => setCategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                          min="0"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateCategory(false);
                            setEditingCategory(null);
                            resetForms();
                          }}
                          className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {editingCategory ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subcategories' && (
            <div className="space-y-6">
              {/* Subcategories Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Project Subcategories
                </h3>
                <button
                  onClick={openCreateSubcategory}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Subcategory
                </button>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Select Category
                </label>
                <select
                  value={selectedCategory?.id || ''}
                  onChange={(e) => {
                    const category = projectData.categories.find(c => c.id === e.target.value);
                    setSelectedCategory(category || null);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {projectData.categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategories List */}
              {selectedCategory && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectData.subcategories
                    .filter(sub => sub.category_id === selectedCategory.id)
                    .map((subcategory) => (
                      <div key={subcategory.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: subcategory.color }}
                            ></div>
                            <h4 className="font-medium text-neutral-900 dark:text-white">
                              {subcategory.name}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setEditingSubcategory(subcategory)}
                              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {subcategory.description && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                            {subcategory.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                          <span>Order: {subcategory.sort_order}</span>
                          <span>Color: {subcategory.color}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Create Subcategory Modal */}
              {showCreateSubcategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                        New Subcategory
                      </h3>
                      <button
                        onClick={() => {
                          setShowCreateSubcategory(false);
                          resetForms();
                        }}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateSubcategory();
                    }} className="p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Category
                        </label>
                        <input
                          type="text"
                          value={selectedCategory?.name || ''}
                          disabled
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-100 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={subcategoryForm.name}
                          onChange={(e) => setSubcategoryForm(prev => ({ ...prev, name: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.name 
                              ? 'border-red-300 focus:ring-red-500' 
                              : 'border-neutral-300 dark:border-neutral-600'
                          } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                          placeholder="Subcategory name"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={subcategoryForm.description}
                          onChange={(e) => setSubcategoryForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                          placeholder="Subcategory description"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Color *
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setSubcategoryForm(prev => ({ ...prev, color }))}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                subcategoryForm.color === color 
                                  ? 'border-neutral-900 dark:border-white scale-110' 
                                  : 'border-neutral-300 dark:border-neutral-600 hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {errors.color && (
                          <p className="mt-1 text-sm text-red-600">{errors.color}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={subcategoryForm.sort_order}
                          onChange={(e) => setSubcategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                          min="0"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateSubcategory(false);
                            resetForms();
                          }}
                          className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
