'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Folder, 
  File, 
  Upload, 
  Plus, 
  Download, 
  Trash2, 
  Edit, 
  Eye,
  ArrowLeft,
  RefreshCw,
  Settings,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
}

export default function GoogleDrivePage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configData, setConfigData] = useState({
    clientId: '',
    clientSecret: ''
  });
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{id: string, name: string}>>([
    { id: 'root', name: 'My Drive' }
  ]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/google-drive/config');
      const data = await response.json();
      
      if (data.configured) {
        setIsConfigured(true);
        loadDriveContent();
      } else {
        setIsConfigured(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking configuration:', error);
      setIsConfigured(false);
      setLoading(false);
    }
  };

  const loadDriveContent = async (folderId: string = 'root') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/google-drive/files?folderId=${folderId}`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files || []);
        setFolders(data.folders || []);
        setCurrentFolder(folderId);
        
        // Update breadcrumbs
        if (folderId !== 'root') {
          const folderResponse = await fetch(`/api/google-drive/folder-path?folderId=${folderId}`);
          const folderData = await folderResponse.json();
          if (folderData.success) {
            setBreadcrumbs(folderData.breadcrumbs);
          }
        } else {
          setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
        }
      } else {
        toast.error('Failed to load drive content');
      }
    } catch (error) {
      console.error('Error loading drive content:', error);
      toast.error('Error loading drive content');
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!configData.clientId || !configData.clientSecret) {
      toast.error('Please provide both Client ID and Client Secret');
      return;
    }

    try {
      const response = await fetch('/api/google-drive/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Configuration saved successfully');
        setIsConfigured(true);
        setShowConfig(false);
        loadDriveContent();
      } else {
        toast.error(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Error saving configuration');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', currentFolder);

        const response = await fetch('/api/google-drive/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (!data.success) {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      
      toast.success('Files uploaded successfully');
      loadDriveContent(currentFolder);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error uploading files');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      const response = await fetch('/api/google-drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          parentId: currentFolder,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Folder created successfully');
        loadDriveContent(currentFolder);
      } else {
        toast.error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Error creating folder');
    }
  };

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/google-drive/download?fileId=${fileId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error downloading file');
    }
  };

  const handleDeleteItems = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select items to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
      return;
    }

    try {
      const response = await fetch('/api/google-drive/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileIds: selectedItems }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Items deleted successfully');
        setSelectedItems([]);
        loadDriveContent(currentFolder);
      } else {
        toast.error(data.error || 'Failed to delete items');
      }
    } catch (error) {
      console.error('Error deleting items:', error);
      toast.error('Error deleting items');
    }
  };

  const navigateToFolder = (folderId: string) => {
    loadDriveContent(folderId);
  };

  const navigateBreadcrumb = (folderId: string) => {
    loadDriveContent(folderId);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !isConfigured) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg mr-4">
                <Settings className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Google Drive Not Configured</h1>
                <p className="text-neutral-600 dark:text-neutral-400">Contact your administrator to set up Google Drive integration</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Configuration Required
                  </h3>
                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    <p>
                      Google Drive integration has not been configured for this application. 
                      Please contact your system administrator to set up the Google Drive 
                      OAuth credentials and enable this feature.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                What your administrator needs to do:
              </h3>
              <ol className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                <li>1. Set up Google Cloud Project with Drive API enabled</li>
                <li>2. Configure OAuth 2.0 credentials</li>
                <li>3. Add authorized redirect URIs</li>
                <li>4. Configure the integration in the admin panel</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4">
            <Folder className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Google Drive</h1>
            <p className="text-neutral-600 dark:text-neutral-400">Manage your files and folders</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            title="Configuration"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => loadDriveContent(currentFolder)}
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mb-6 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={configData.clientId}
                onChange={(e) => setConfigData(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={configData.clientSecret}
                onChange={(e) => setConfigData(prev => ({ ...prev, clientSecret: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex space-x-2 mt-4">
            <button
              onClick={saveConfiguration}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="bg-neutral-300 dark:bg-neutral-600 hover:bg-neutral-400 dark:hover:bg-neutral-500 text-neutral-700 dark:text-neutral-200 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 mb-4 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center">
            {index > 0 && <span className="text-neutral-400 mx-2">/</span>}
            <button
              onClick={() => navigateBreadcrumb(crumb.id)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <label className="relative cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            <Upload className="h-4 w-4 inline mr-2" />
            Upload Files
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          <button
            onClick={handleCreateFolder}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </button>

          {selectedItems.length > 0 && (
            <button
              onClick={handleDeleteItems}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedItems.length})
            </button>
          )}
        </div>

        {uploading && (
          <div className="flex items-center text-blue-600 dark:text-blue-400">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Uploading...
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="loading-spinner h-8 w-8 mx-auto mb-4"></div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg overflow-hidden">
          {/* Folders */}
          {folders.length > 0 && (
            <div className="border-b border-neutral-200 dark:border-neutral-700">
              <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Folders
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer ${
                      selectedItems.includes(folder.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => toggleItemSelection(folder.id)}
                    onDoubleClick={() => navigateToFolder(folder.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(folder.id)}
                      onChange={() => toggleItemSelection(folder.id)}
                      className="mr-3"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900 dark:text-white">{folder.name}</div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        Modified {new Date(folder.modifiedTime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Files
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700 ${
                      selectedItems.includes(file.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => toggleItemSelection(file.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(file.id)}
                      onChange={() => toggleItemSelection(file.id)}
                      className="mr-3"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <File className="h-5 w-5 text-neutral-600 dark:text-neutral-400 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900 dark:text-white">{file.name}</div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {file.size && `${formatFileSize(parseInt(file.size))} • `}
                        Modified {new Date(file.modifiedTime).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          title="View in Google Drive"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleFileDownload(file.id, file.name)}
                        className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {folders.length === 0 && files.length === 0 && (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No files or folders</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                This folder is empty. Upload files or create a new folder to get started.
              </p>
              <div className="flex items-center justify-center space-x-2">
                <label className="relative cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  <Upload className="h-4 w-4 inline mr-2" />
                  Upload Files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleCreateFolder}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Folder
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
