'use client';

import { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

export default function UploadTicketsPage() {
  return (
    <div className="space-y-6">
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Tickets</h1>
        <p className="text-gray-600 mt-2">
          Upload and manage ticket data from external sources.
                   </p>
                 </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                   <div>
            <h3 className="text-lg font-medium text-yellow-800">
              Under Maintenance
            </h3>
            <p className="text-yellow-700 mt-1">
              This page is temporarily disabled during our system migration. 
              We're updating it to use our new secure proxy system.
            </p>
            <p className="text-yellow-700 mt-2">
              Expected completion: Phase 2 of our migration plan.
                  </p>
                </div>
                    </div>
                  </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ticket Upload Functionality
          </h3>
          <p className="text-gray-600">
            This feature allows you to upload ticket data from external sources 
            and map them to your projects and users.
          </p>
            </div>
          </div>
    </div>
  );
}
