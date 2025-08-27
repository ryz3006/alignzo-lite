'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Download, Filter, RefreshCw, Eye, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabaseClient } from '@/lib/supabase-client';

interface AuditEntry {
  id: string;
  user_email: string;
  event_type: string;
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  success: boolean;
  error_message?: string;
  metadata?: any;
  created_at: string;
}

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  user_email?: string;
  ip_address?: string;
  metadata?: any;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

export default function AuditTrailPage() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'alerts'>('audit');
  
  // Modal state for viewing audit entry details
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    userEmail: '',
    eventType: '',
    tableName: '',
    severity: '',
    dateFrom: '',
    dateTo: '',
    success: '',
    acknowledged: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, pageSize, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        // Use the audit trail API for audit entries
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
          ),
        });

        // Get admin session for authentication
        const adminSession = localStorage.getItem('admin_session');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (adminSession) {
          try {
            const session = JSON.parse(adminSession);
            headers['x-admin-email'] = session.email;
          } catch (error) {
            console.error('Error parsing admin session:', error);
          }
        }

        const response = await fetch(`/api/admin/audit-trail?${params}`, {
          headers
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch audit data');
        }

        const data = await response.json();
        setAuditEntries(data.entries || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        // Use the security alerts API for alerts
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
          ),
        });

        // Get admin session for authentication
        const adminSession = localStorage.getItem('admin_session');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (adminSession) {
          try {
            const session = JSON.parse(adminSession);
            headers['x-admin-email'] = session.email;
          } catch (error) {
            console.error('Error parsing admin session:', error);
          }
        }

        const response = await fetch(`/api/admin/security-alerts?${params}`, {
          headers
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch security alerts');
        }

        const data = await response.json();
        setSecurityAlerts(data.alerts || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      // Get admin session for authentication
      const adminSession = localStorage.getItem('admin_session');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          headers['x-admin-email'] = session.email;
        } catch (error) {
          console.error('Error parsing admin session:', error);
        }
      }

      const response = await fetch(`/api/admin/security-alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        toast.success('Alert acknowledged');
        fetchData();
      } else {
        throw new Error('Failed to acknowledge alert');
      }
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      // Get admin session for authentication
      const adminSession = localStorage.getItem('admin_session');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          headers['x-admin-email'] = session.email;
        } catch (error) {
          console.error('Error parsing admin session:', error);
        }
      }

      const response = await fetch(`/api/admin/security-alerts/${alertId}/resolve`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        toast.success('Alert resolved');
        fetchData();
      } else {
        throw new Error('Failed to resolve alert');
      }
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  const handleViewEntry = (entry: AuditEntry) => {
    setSelectedEntry(entry);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedEntry(null);
  };

  const exportData = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });

      // Get admin session for authentication
      const adminSession = localStorage.getItem('admin_session');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          headers['x-admin-email'] = session.email;
        } catch (error) {
          console.error('Error parsing admin session:', error);
        }
      }

      const endpoint = activeTab === 'audit' ? '/api/admin/audit-trail/export' : '/api/admin/security-alerts/export';
      const response = await fetch(`${endpoint}?${params}`, {
        headers
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}-trail-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Data exported successfully');
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'CREATE': return 'bg-green-500';
      case 'UPDATE': return 'bg-blue-500';
      case 'DELETE': return 'bg-red-500';
      case 'READ': return 'bg-gray-500';
      case 'LOGIN': return 'bg-purple-500';
      case 'SECURITY_EVENT': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit Trail & Security Monitoring</h1>
        <div className="flex gap-2">
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'audit' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'alerts' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Security Alerts
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">User Email</label>
              <Input
                placeholder="Filter by user email"
                value={filters.userEmail}
                onChange={(e) => handleFilterChange('userEmail', e.target.value)}
              />
            </div>
            
            {activeTab === 'audit' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Event Type</label>
                  <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All events</SelectItem>
                      <SelectItem value="CREATE">Create</SelectItem>
                      <SelectItem value="READ">Read</SelectItem>
                      <SelectItem value="UPDATE">Update</SelectItem>
                      <SelectItem value="DELETE">Delete</SelectItem>
                      <SelectItem value="LOGIN">Login</SelectItem>
                      <SelectItem value="SECURITY_EVENT">Security Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Table Name</label>
                  <Input
                    placeholder="Filter by table"
                    value={filters.tableName}
                    onChange={(e) => handleFilterChange('tableName', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Success Status</label>
                  <Select value={filters.success} onValueChange={(value) => handleFilterChange('success', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      <SelectItem value="true">Success</SelectItem>
                      <SelectItem value="false">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All severities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select value={filters.acknowledged} onValueChange={(value) => handleFilterChange('acknowledged', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All alerts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All alerts</SelectItem>
                      <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'audit' ? 'Audit Trail Entries' : 'Security Alerts'}
            <span className="ml-2 text-sm text-gray-500">
              ({activeTab === 'audit' ? auditEntries.length : securityAlerts.length} entries)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'audit' ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Timestamp</th>
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Event</th>
                      <th className="text-left p-2">Table</th>
                      <th className="text-left p-2">IP Address</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-sm">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="p-2 text-sm">{entry.user_email}</td>
                        <td className="p-2">
                          <Badge className={getEventTypeColor(entry.event_type)}>
                            {entry.event_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">{entry.table_name}</td>
                        <td className="p-2 text-sm">{entry.ip_address}</td>
                        <td className="p-2">
                          <Badge className={entry.success ? 'bg-green-500' : 'bg-red-500'}>
                            {entry.success ? 'Success' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewEntry(entry)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Timestamp</th>
                      <th className="text-left p-2">Severity</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Message</th>
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityAlerts.map((alert) => (
                      <tr key={alert.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-sm">
                          {new Date(alert.created_at).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">{alert.alert_type}</td>
                        <td className="p-2 text-sm max-w-xs truncate">{alert.message}</td>
                        <td className="p-2 text-sm">{alert.user_email || 'N/A'}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {alert.resolved ? (
                              <Badge className="bg-green-500">Resolved</Badge>
                            ) : alert.acknowledged ? (
                              <Badge className="bg-yellow-500">Acknowledged</Badge>
                            ) : (
                              <Badge className="bg-red-500">New</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              disabled={alert.acknowledged}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleResolveAlert(alert.id)}
                              disabled={alert.resolved}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Modal for Audit Entry Details */}
      {showViewModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Audit Entry Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeViewModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(selectedEntry.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedEntry.user_email}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                    <Badge className={getEventTypeColor(selectedEntry.event_type)}>
                      {selectedEntry.event_type}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedEntry.table_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Record ID</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedEntry.record_id || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Badge className={selectedEntry.success ? 'bg-green-500' : 'bg-red-500'}>
                      {selectedEntry.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                </div>
                
                {/* Request Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Request Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HTTP Method</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedEntry.method}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded break-all">
                      {selectedEntry.endpoint}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedEntry.ip_address}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded break-all">
                      {selectedEntry.user_agent}
                    </p>
                  </div>
                  
                  {selectedEntry.error_message && (
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-1">Error Message</label>
                      <p className="text-sm text-red-900 bg-red-50 p-2 rounded">
                        {selectedEntry.error_message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Data Changes */}
              {(selectedEntry.old_values || selectedEntry.new_values || selectedEntry.metadata) && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Data Changes</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedEntry.old_values && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Previous Values</label>
                        <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded border overflow-x-auto">
                          {JSON.stringify(selectedEntry.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {selectedEntry.new_values && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Values</label>
                        <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded border overflow-x-auto">
                          {JSON.stringify(selectedEntry.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  
                  {selectedEntry.metadata && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional Metadata</label>
                      <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded border overflow-x-auto">
                        {JSON.stringify(selectedEntry.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button onClick={closeViewModal} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
