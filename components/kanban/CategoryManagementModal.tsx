'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Trash2, Palette, Settings } from 'lucide-react';
import { ProjectWithCategories, ProjectCategory, CategoryOption, CreateCategoryForm } from '@/lib/kanban-types';
import { createProjectCategory, updateProjectCategory, deleteProjectCategory, createCategoryOption, updateCategoryOption, deleteCategoryOption } from '@/lib/kanban-api';

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
  const [activeTab, setActiveTab] = useState<'categories' | 'options'>('categories');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateOption, setShowCreateOption] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null);
  const [editingOption, setEditingOption] = useState<CategoryOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState<CreateCategoryForm>({
    name: '',
    description: '',
    color: '#3B82F6',
    sort_order: 0
  });

  const [optionForm, setOptionForm] = useState<{ option_name: string; option_value: string; sort_order: number }>({
    option_name: '',
    option_value: '',
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

  const validateOptionForm = (): boolean => {
    const newErrors: any = {};

    if (!optionForm.option_name.trim()) {
      newErrors.option_name = 'Option name is required';
    }

    if (!optionForm.option_value.trim()) {
      newErrors.option_value = 'Option value is required';
    }

    if (!selectedCategory) {
      newErrors.category = 'Please select a category first';
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

  const handleCreateOption = async () => {
    if (!validateOptionForm()) return;

    try {
      const response = await createCategoryOption(selectedCategory!.id, optionForm);
      if (response.success) {
        setShowCreateOption(false);
        setOptionForm({ option_name: '', option_value: '', sort_order: 0 });
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating category option:', error);
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
    if (!confirm('Are you sure you want to delete this category? This will also delete all associated options.')) {
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

  const openCreateOption = () => {
    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }
    setShowCreateOption(true);
    setOptionForm({ option_name: '', option_value: '', sort_order: 0 });
    setErrors({});
  };

  const resetForms = () => {
    setShowCreateCategory(false);
    setShowCreateOption(false);
    setEditingCategory(null);
    setEditingOption(null);
    setCategoryForm({ name: '', description: '', color: '#3B82F6', sort_order: 0 });
    setOptionForm({ option_name: '', option_value: '', sort_order: 0 });
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
              { id: 'options', label: 'Category Options' }
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

          {activeTab === 'options' && (
            <div className="space-y-6">
              {/* Category Options Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Category Options
                </h3>
                <button
                  onClick={openCreateOption}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Option
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

              {/* Options List */}
              {selectedCategory && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(selectedCategory.options || [])
                    .map((option) => (
                      <div key={option.id} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-neutral-900 dark:text-white">
                              {option.option_name}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setEditingOption(option)}
                              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                          Value: {option.option_value}
                        </div>

                        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                          <span>Order: {option.sort_order}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Create Option Modal */}
              {showCreateOption && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                        New Category Option
                      </h3>
                      <button
                        onClick={() => {
                          setShowCreateOption(false);
                          resetForms();
                        }}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateOption();
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
                          Option Name *
                        </label>
                        <input
                          type="text"
                          value={optionForm.option_name}
                          onChange={(e) => setOptionForm(prev => ({ ...prev, option_name: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.option_name 
                              ? 'border-red-300 focus:ring-red-500' 
                              : 'border-neutral-300 dark:border-neutral-600'
                          } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                          placeholder="Option name"
                        />
                        {errors.option_name && (
                          <p className="mt-1 text-sm text-red-600">{errors.option_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Option Value *
                        </label>
                        <input
                          type="text"
                          value={optionForm.option_value}
                          onChange={(e) => setOptionForm(prev => ({ ...prev, option_value: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.option_value 
                              ? 'border-red-300 focus:ring-red-500' 
                              : 'border-neutral-300 dark:border-neutral-600'
                          } bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white`}
                          placeholder="Option value"
                        />
                        {errors.option_value && (
                          <p className="mt-1 text-sm text-red-600">{errors.option_value}</p>
                        )}
                      </div>



                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={optionForm.sort_order}
                          onChange={(e) => setOptionForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                          min="0"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateOption(false);
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
