'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface JiraTicket {
  key: string;
  id: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  project: string;
  projectKey: string;
  issueType: string;
  created: string;
  updated: string;
  jiraUrl: string;
}

interface Transition {
  id: string;
  name: string;
  to: string;
  hasScreen: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isConditional: boolean;
}

interface TicketStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: JiraTicket;
  userEmail: string;
  onStatusUpdate: () => void;
}

export default function TicketStatusModal({
  isOpen,
  onClose,
  ticket,
  userEmail,
  onStatusUpdate
}: TicketStatusModalProps) {
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [selectedTransition, setSelectedTransition] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingTransitions, setLoadingTransitions] = useState(false);

  useEffect(() => {
    if (isOpen && ticket) {
      loadTransitions();
    }
  }, [isOpen, ticket]);

  const loadTransitions = async () => {
    setLoadingTransitions(true);
    try {
      const response = await fetch(
        `/api/jira/ticket-transitions?userEmail=${encodeURIComponent(userEmail)}&ticketKey=${encodeURIComponent(ticket.key)}`
      );
      const data = await response.json();
      
      if (data.success) {
        setTransitions(data.transitions);
        // Auto-select the first transition if available
        if (data.transitions.length > 0) {
          setSelectedTransition(data.transitions[0].id);
        }
      } else {
        toast.error(data.error || 'Failed to load available transitions');
      }
    } catch (error) {
      console.error('Error loading transitions:', error);
      toast.error('Failed to load available transitions');
    } finally {
      setLoadingTransitions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTransition) {
      toast.error('Please select a status transition');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/jira/ticket-transitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
          ticketKey: ticket.key,
          transitionId: selectedTransition,
          comment: comment.trim() || undefined
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Ticket status updated successfully');
        onStatusUpdate();
        onClose();
        setComment('');
        setSelectedTransition('');
      } else {
        toast.error(data.error || 'Failed to update ticket status');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setComment('');
    setSelectedTransition('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Update Ticket Status
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Update the status of{' '}
                      <a
                        href={ticket.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {ticket.key}
                      </a>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {ticket.summary}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Current Status: <span className="font-medium">{ticket.status}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Status Selection */}
                <div>
                  <label htmlFor="transition" className="block text-sm font-medium text-gray-700">
                    New Status
                  </label>
                  {loadingTransitions ? (
                    <div className="mt-1 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-gray-500">Loading available transitions...</span>
                    </div>
                  ) : (
                    <select
                      id="transition"
                      value={selectedTransition}
                      onChange={(e) => setSelectedTransition(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a status transition...</option>
                      {transitions.map((transition) => (
                        <option key={transition.id} value={transition.id}>
                          {transition.name}
                          {transition.to && transition.to !== transition.name && ` → ${transition.to}`}
                        </option>
                      ))}
                    </select>
                  )}
                  {transitions.length === 0 && !loadingTransitions && (
                    <p className="mt-1 text-sm text-gray-500">
                      No available transitions found for this ticket.
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                    Comment (Optional)
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Add a comment about this status change..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This comment will be added to the ticket's activity log.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || !selectedTransition || loadingTransitions}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
