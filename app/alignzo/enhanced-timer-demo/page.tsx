'use client';

import { useState } from 'react';
import EnhancedTimerModal from '@/components/EnhancedTimerModal';
import EnhancedWorkLogModal from '@/components/EnhancedWorkLogModal';
import { Play, Clock, Plus } from 'lucide-react';

export default function EnhancedTimerDemo() {
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Enhanced Timer & Work Log Demo
          </h1>
          <p className="text-lg text-gray-600">
            Experience the new JIRA-integrated timer and work log functionality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timer Modal Demo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Play className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Enhanced Timer Modal</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Start a new timer with JIRA integration. Features include:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-2">
              <li>• Ticket source selection (Custom/JIRA)</li>
              <li>• JIRA project mapping integration</li>
              <li>• Search existing JIRA tickets</li>
              <li>• Create new JIRA tickets</li>
              <li>• Dynamic project categories</li>
            </ul>
            <button
              onClick={() => setShowTimerModal(true)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Open Timer Modal
            </button>
          </div>

          {/* Work Log Modal Demo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Enhanced Work Log Modal</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Add work logs with JIRA integration. Features include:
            </p>
            <ul className="text-sm text-gray-600 mb-6 space-y-2">
              <li>• Ticket source selection (Custom/JIRA)</li>
              <li>• JIRA project mapping integration</li>
              <li>• Search existing JIRA tickets</li>
              <li>• Create new JIRA tickets</li>
              <li>• Time spent input with flexible format</li>
              <li>• Dynamic project categories</li>
            </ul>
            <button
              onClick={() => setShowWorkLogModal(true)}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Open Work Log Modal
            </button>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">JIRA Integration</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Automatic JIRA integration detection</li>
                <li>• Project mapping support</li>
                <li>• Ticket search with LIKE operator</li>
                <li>• Create new tickets on-the-fly</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Smart Ticket Management</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Choose between Custom and JIRA tickets</li>
                <li>• Search existing tickets by ID or summary</li>
                <li>• Auto-populate ticket details</li>
                <li>• Seamless ticket creation workflow</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Enhanced UX</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Intuitive search interface</li>
                <li>• Real-time ticket creation</li>
                <li>• Flexible time input formats</li>
                <li>• Dynamic category support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">For JIRA Users:</h3>
              <ol className="text-sm text-gray-700 space-y-1 ml-4">
                <li>1. Select "JIRA" as ticket source</li>
                <li>2. Choose the mapped JIRA project</li>
                <li>3. Search for existing tickets or create new ones</li>
                <li>4. Fill in task details and start tracking</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">For Custom Work:</h3>
              <ol className="text-sm text-gray-700 space-y-1 ml-4">
                <li>1. Select "Custom" as ticket source</li>
                <li>2. Enter your own ticket ID</li>
                <li>3. Fill in task details and time spent</li>
                <li>4. Save your work log</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EnhancedTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
      />

      <EnhancedWorkLogModal
        isOpen={showWorkLogModal}
        onClose={() => setShowWorkLogModal(false)}
      />
    </div>
  );
}
