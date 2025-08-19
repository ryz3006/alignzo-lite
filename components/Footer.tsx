'use client';

import { useState } from 'react';
import { Github, ExternalLink, BookOpen } from 'lucide-react';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);

  return (
    <>
      <footer className={`bg-gray-900 text-white py-8 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand Section */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-auto" />
                <h3 className="text-lg font-semibold">Alignzo Lite</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Professional work log tracking and reporting application
              </p>
            </div>

            {/* Links Section */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => setShowSetupModal(true)}
                    className="text-gray-400 hover:text-white flex items-center space-x-2 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>How can I build this app for myself?</span>
                  </button>
                </li>
                <li>
                  <a
                    href="https://github.com/ryz3006"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white flex items-center space-x-2 transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    <span>View Source Code</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* License Section */}
            <div>
              <h4 className="text-sm font-semibold mb-4">License & Attribution</h4>
              <div className="text-sm text-gray-400 space-y-2">
                <p>
                  Made with ❤️ by{' '}
                  <a
                    href="https://github.com/ryz3006"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    @ryz3006
                  </a>
                </p>
                <p>
                  <strong>MIT License</strong> - Free to use, modify, and distribute
                </p>
                <p className="text-xs">
                  This project is open source and available under the MIT License.
                  You are free to use, modify, and distribute this software.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">
              © 2025 Alignzo Lite. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Setup Guide Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  How to Build This App From Scratch
                </h3>
                <button
                  onClick={() => setShowSetupModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-8 max-h-96 overflow-y-auto">
                {/* Prerequisites */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Prerequisites</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                    <li>Node.js 18+ installed on your system</li>
                    <li>Git installed and configured</li>
                    <li>A GitHub account</li>
                    <li>A Firebase account</li>
                    <li>A Supabase account</li>
                    <li>A Vercel account (for deployment)</li>
                  </ul>
                </div>

                {/* Step 1: Clone Repository */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Step 1: Clone the Repository</h4>
                  <div className="bg-gray-100 p-4 rounded-md">
                    <code className="text-sm">
                      git clone https://github.com/ryz3006/alignzo-lite.git<br />
                      cd alignzo-lite<br />
                      npm install
                    </code>
                  </div>
                </div>

                {/* Step 2: Firebase Setup */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Step 2: Firebase Authentication Setup</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>
                      Go to{' '}
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Firebase Console
                      </a>
                    </li>
                    <li>Create a new project or select an existing one</li>
                    <li>Enable Authentication in the left sidebar</li>
                    <li>Add Google Sign-in provider:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Click on "Sign-in method" tab</li>
                        <li>Enable Google provider</li>
                        <li>Add your domain to authorized domains</li>
                      </ul>
                    </li>
                    <li>Create a web app:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Click on the gear icon → Project settings</li>
                        <li>Scroll down to "Your apps" section</li>
                        <li>Click "Add app" → Web app</li>
                        <li>Copy the configuration object</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                {/* Step 3: Supabase Setup */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Step 3: Supabase Database Setup</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>
                      Go to{' '}
                      <a
                        href="https://supabase.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Supabase
                      </a>
                    </li>
                    <li>Create a new project</li>
                    <li>Get your API credentials:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Go to Settings → API</li>
                        <li>Copy the Project URL and anon public key</li>
                      </ul>
                    </li>
                                         <li>Set up the database schema:
                       <ul className="list-disc list-inside ml-4 mt-1">
                         <li>Go to SQL Editor</li>
                         <li>Run the complete schema from <code className="bg-gray-200 px-1 rounded">database/schema.sql</code> (includes team-project assignments)</li>
                       </ul>
                     </li>
                  </ol>
                </div>

                {/* Step 4: Environment Variables */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Step 4: Environment Configuration</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Create a <code className="bg-gray-200 px-1 rounded">.env.local</code> file in your project root:
                  </p>
                  <div className="bg-gray-100 p-4 rounded-md text-sm">
                    <code>
                      # Admin Credentials<br />
                      ADMIN_EMAIL=your-admin-email@example.com<br />
                      ADMIN_PASSWORD=your-admin-password<br />
                      <br />
                      # Firebase Configuration<br />
                      NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key<br />
                      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com<br />
                      NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id<br />
                      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com<br />
                      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789<br />
                      NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id<br />
                      <br />
                      # Supabase Configuration<br />
                      NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co<br />
                      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
                    </code>
                  </div>
                </div>

                {/* Step 5: Vercel Deployment */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Step 5: Vercel Deployment</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>
                      Go to{' '}
                      <a
                        href="https://vercel.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Vercel
                      </a>
                    </li>
                    <li>Sign up/Login with your GitHub account</li>
                    <li>Click "New Project"</li>
                    <li>Import your GitHub repository</li>
                    <li>Configure environment variables:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Go to Project Settings → Environment Variables</li>
                        <li>Add all the variables from your <code className="bg-gray-200 px-1 rounded">.env.local</code></li>
                      </ul>
                    </li>
                    <li>Deploy the project</li>
                  </ol>
                </div>

                {/* Additional Resources */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Resources</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>
                      •{' '}
                      <a
                        href="https://nextjs.org/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Next.js Documentation
                      </a>
                    </li>
                    <li>
                      •{' '}
                      <a
                        href="https://firebase.google.com/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Firebase Documentation
                      </a>
                    </li>
                    <li>
                      •{' '}
                      <a
                        href="https://supabase.com/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Supabase Documentation
                      </a>
                    </li>
                    <li>
                      •{' '}
                      <a
                        href="https://vercel.com/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Vercel Documentation
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSetupModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Close
                  </button>
                  <a
                    href="https://github.com/ryz3006/alignzo-lite"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Github className="h-4 w-4" />
                    <span>View on GitHub</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
