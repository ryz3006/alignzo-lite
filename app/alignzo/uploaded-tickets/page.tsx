'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { UploadedTicket } from '@/lib/supabase';
import { Eye, Trash2, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadedTicketsPage() {
  const [uploadedTickets, setUploadedTickets] = useState<UploadedTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<UploadedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [showTicketDetailsModal, setShowTicketDetailsModal] = useState(false);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<UploadedTicket | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(25);

  useEffect(() => {
    loadUploadedTickets();
  }, []);

  useEffect(() => {
    // Filter tickets based on search term
    const filtered = uploadedTickets.filter(ticket => 
      ticket.incident_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.user_name && ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.assignee && ticket.assignee.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredTickets(filtered);
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, uploadedTickets]);

  const loadUploadedTickets = async () => {
    try {
      setLoading(true);
      const response = await supabaseClient.get('uploaded_tickets', {
        select: '*',
        order: { column: 'created_at', ascending: false }
      });

      if (response.error) {
        console.error('Error loading uploaded tickets:', response.error);
        throw new Error(response.error);
      }
      setUploadedTickets(response.data || []);
      setFilteredTickets(response.data || []);
    } catch (error) {
      console.error('Error loading uploaded tickets:', error);
      toast.error('Failed to load uploaded tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicketDetails = (ticket: UploadedTicket) => {
    setSelectedTicketDetails(ticket);
    setShowTicketDetailsModal(true);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      const response = await supabaseClient.delete('uploaded_tickets', ticketId);

      if (response.error) {
        console.error('Error deleting ticket:', response.error);
        throw new Error(response.error);
      }
      toast.success('Ticket deleted successfully');
      loadUploadedTickets();
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast.error(error.message || 'Failed to delete ticket');
    }
  };

  const handleDeleteMultipleTickets = async () => {
    if (selectedTickets.length === 0) {
      toast.error('Please select tickets to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedTickets.length} tickets?`)) {
      return;
    }

    try {
      // TODO: Implement bulk delete in proxy - for now, delete one by one
      for (const ticketId of selectedTickets) {
        const response = await supabaseClient.delete('uploaded_tickets', ticketId);
        if (response.error) {
          console.error('Error deleting ticket:', response.error);
          throw new Error(response.error);
        }
      }
      toast.success(`${selectedTickets.length} tickets deleted successfully`);
      setSelectedTickets([]);
      loadUploadedTickets();
    } catch (error: any) {
      console.error('Error deleting tickets:', error);
      toast.error(error.message || 'Failed to delete tickets');
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAllTickets = () => {
    const currentTickets = filteredTickets.slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage);
    const currentTicketIds = currentTickets.map(ticket => ticket.id);
    
    if (selectedTickets.length === currentTicketIds.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(currentTicketIds);
    }
  };

  // Pagination calculations
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Uploaded Ticket Entries</h1>
          <p className="text-gray-600">View and manage uploaded ticket data</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadUploadedTickets}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by Ticket ID, User Name, or Assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          {selectedTickets.length > 0 && (
            <button
              onClick={handleDeleteMultipleTickets}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedTickets.length})
            </button>
          )}
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-600 mb-4">
          Showing {filteredTickets.length} of {uploadedTickets.length} tickets
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-neutral-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {searchTerm ? 'No tickets found' : 'No uploaded tickets'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                {searchTerm ? 'Try adjusting your search terms' : 'Upload your first ticket dump to see entries here.'}
              </p>
            </div>
          ) : (
            <div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                  <thead className="bg-gray-50 dark:bg-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedTickets.length === currentTickets.length && currentTickets.length > 0}
                          onChange={handleSelectAllTickets}
                          className="rounded border-gray-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Ticket ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Assignee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Created Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                    {currentTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedTickets.includes(ticket.id)}
                            onChange={() => handleSelectTicket(ticket.id)}
                            className="rounded border-gray-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {(ticket as any).source?.name || 'Remedy'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                          {ticket.incident_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {ticket.assignee || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-400">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ticket.status === 'Resolved' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                            ticket.status === 'Closed' ? 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-300' :
                            ticket.status === 'Pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                            'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                          }`}>
                            {ticket.status || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewTicketDetails(ticket)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete ticket"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700 dark:text-neutral-300">
                    Showing {indexOfFirstTicket + 1} to {Math.min(indexOfLastTicket, filteredTickets.length)} of {filteredTickets.length} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-neutral-400 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details Modal */}
      {showTicketDetailsModal && selectedTicketDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-4/5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">Ticket Details</h3>
              <button
                onClick={() => setShowTicketDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Basic Information</h4>
                <div className="space-y-2 text-gray-700 dark:text-neutral-300">
                  <div><span className="font-medium">Incident ID:</span> {selectedTicketDetails.incident_id}</div>
                  <div><span className="font-medium">Priority:</span> {selectedTicketDetails.priority || '-'}</div>
                  <div><span className="font-medium">Status:</span> {selectedTicketDetails.status || '-'}</div>
                  <div><span className="font-medium">Region:</span> {selectedTicketDetails.region || '-'}</div>
                  <div><span className="font-medium">Department:</span> {selectedTicketDetails.department || '-'}</div>
                  <div><span className="font-medium">Company:</span> {selectedTicketDetails.company || '-'}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Assignment</h4>
                <div className="space-y-2 text-gray-700 dark:text-neutral-300">
                  <div><span className="font-medium">Assigned Organization:</span> {selectedTicketDetails.assigned_support_organization || '-'}</div>
                  <div><span className="font-medium">Assigned Group:</span> {selectedTicketDetails.assigned_group || '-'}</div>
                  <div><span className="font-medium">Assignee:</span> {selectedTicketDetails.assignee || '-'}</div>
                  <div><span className="font-medium">Owner:</span> {selectedTicketDetails.owner || '-'}</div>
                  <div><span className="font-medium">Submitter:</span> {selectedTicketDetails.submitter || '-'}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Timeline</h4>
                <div className="space-y-2 text-gray-700 dark:text-neutral-300">
                  <div><span className="font-medium">Reported Date:</span> {selectedTicketDetails.reported_date1 ? new Date(selectedTicketDetails.reported_date1).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Responded Date:</span> {selectedTicketDetails.responded_date ? new Date(selectedTicketDetails.responded_date).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Resolved Date:</span> {selectedTicketDetails.last_resolved_date ? new Date(selectedTicketDetails.last_resolved_date).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Closed Date:</span> {selectedTicketDetails.closed_date ? new Date(selectedTicketDetails.closed_date).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Created:</span> {new Date(selectedTicketDetails.created_at).toLocaleString()}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Metrics</h4>
                <div className="space-y-2 text-gray-700 dark:text-neutral-300">
                  <div><span className="font-medium">Group Transfers:</span> {selectedTicketDetails.group_transfers || '-'}</div>
                  <div><span className="font-medium">Total Transfers:</span> {selectedTicketDetails.total_transfers || '-'}</div>
                  <div><span className="font-medium">Reopen Count:</span> {selectedTicketDetails.reopen_count || '-'}</div>
                  <div><span className="font-medium">MTTR:</span> {selectedTicketDetails.mttr || '-'}</div>
                  <div><span className="font-medium">MTTI:</span> {selectedTicketDetails.mtti || '-'}</div>
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Summary</h4>
                <div className="bg-gray-50 dark:bg-neutral-700 p-3 rounded-md text-gray-700 dark:text-neutral-300">
                  {selectedTicketDetails.summary || 'No summary available'}
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Resolution</h4>
                <div className="bg-gray-50 dark:bg-neutral-700 p-3 rounded-md text-gray-700 dark:text-neutral-300">
                  {selectedTicketDetails.resolution || 'No resolution available'}
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-neutral-300">
                  <div><span className="font-medium">User Name:</span> {selectedTicketDetails.user_name || '-'}</div>
                  <div><span className="font-medium">Site Group:</span> {selectedTicketDetails.site_group || '-'}</div>
                  <div><span className="font-medium">Vertical:</span> {selectedTicketDetails.vertical || '-'}</div>
                  <div><span className="font-medium">Sub Vertical:</span> {selectedTicketDetails.sub_vertical || '-'}</div>
                  <div><span className="font-medium">Incident Type:</span> {selectedTicketDetails.incident_type || '-'}</div>
                  <div><span className="font-medium">Impact:</span> {selectedTicketDetails.impact || '-'}</div>
                  <div><span className="font-medium">VIP:</span> {selectedTicketDetails.vip ? 'Yes' : 'No'}</div>
                  <div><span className="font-medium">Reported to Vendor:</span> {selectedTicketDetails.reported_to_vendor ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
