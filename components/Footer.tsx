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
                    href="https://github.com/ryz3006/alignzo-lite"
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

                                 {/* Step 1: Create Your Own GitHub Repository */}
                 <div>
                   <h4 className="text-lg font-semibold text-gray-900 mb-3">Step 1: Create Your Own GitHub Repository</h4>
                   <p className="text-sm text-gray-700 mb-3">
                     First, you'll create your own copy of this project on GitHub. This is like creating your own folder in the cloud where you can store and manage your code.
                   </p>
                   
                   <div className="space-y-4">
                     <div>
                       <h5 className="text-md font-semibold text-gray-800 mb-2">Step 1A: Sign Up for GitHub (If you don't have an account)</h5>
                       <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                         <li>
                           Go to{' '}
                           <a
                             href="https://github.com"
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-blue-600 hover:text-blue-800 underline"
                           >
                             GitHub.com
                           </a>
                         </li>
                         <li>Click "Sign up" in the top right corner</li>
                         <li>Enter your email address, create a password, and choose a username</li>
                         <li>Complete the verification process (check your email for a verification link)</li>
                         <li>Log in to your new GitHub account</li>
                       </ol>
                     </div>

                     <div>
                       <h5 className="text-md font-semibold text-gray-800 mb-2">Step 1B: Fork the Repository (Create Your Copy)</h5>
                       <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                         <li>
                           Go to{' '}
                           <a
                             href="https://github.com/ryz3006/alignzo-lite"
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-blue-600 hover:text-blue-800 underline"
                           >
                             the original project on GitHub
                           </a>
                         </li>
                         <li>Click the "Fork" button in the top right corner (it looks like a fork icon)</li>
                         <li>GitHub will ask where to fork it - select your username</li>
                         <li>Wait for the forking process to complete (you'll see a progress bar)</li>
                         <li>You'll be redirected to your own copy of the repository</li>
                         <li>Notice the URL now shows your username instead of "ryz3006"</li>
                       </ol>
                       <p className="text-xs text-gray-500 mt-2">
                         <strong>What is forking?</strong> Forking creates your own copy of someone else's project. You can modify it, add features, and make it your own while keeping a link to the original.
                       </p>
                     </div>

                     <div>
                       <h5 className="text-md font-semibold text-gray-800 mb-2">Step 1C: Clone Your Repository to Your Computer</h5>
                       <p className="text-sm text-gray-600 mb-2">
                         Now you'll download your copy of the project to your computer. Choose one of these methods:
                       </p>
                       
                       <div className="space-y-3">
                         <div>
                           <h6 className="text-sm font-semibold text-gray-700 mb-1">Method 1: Using Command Line (Recommended)</h6>
                           <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                             <li>Open your terminal/command prompt</li>
                             <li>Navigate to where you want to save the project (e.g., Desktop or Documents)</li>
                             <li>Run this command (replace YOUR_USERNAME with your actual GitHub username):</li>
                           </ol>
                           <div className="bg-gray-100 p-3 rounded-md mt-2">
                             <code className="text-sm">
                               git clone https://github.com/YOUR_USERNAME/alignzo-lite.git
                             </code>
                           </div>
                           <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 mt-2">
                             <li>Navigate into the project folder: <code className="bg-gray-200 px-1 rounded">cd alignzo-lite</code></li>
                             <li>Install dependencies: <code className="bg-gray-200 px-1 rounded">npm install</code></li>
                           </ol>
                         </div>

                         <div>
                           <h6 className="text-sm font-semibold text-gray-700 mb-1">Method 2: Using GitHub Desktop</h6>
                           <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                             <li>
                               Download and install{' '}
                               <a
                                 href="https://desktop.github.com"
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="text-blue-600 hover:text-blue-800 underline"
                               >
                                 GitHub Desktop
                               </a>
                             </li>
                             <li>Sign in with your GitHub account</li>
                             <li>Click "Clone a repository from the Internet"</li>
                             <li>Find your forked repository in the list (it will show your username)</li>
                             <li>Choose where to save it on your computer</li>
                             <li>Click "Clone"</li>
                             <li>Open the project folder in your code editor</li>
                             <li>Open terminal in your editor and run: <code className="bg-gray-200 px-1 rounded">npm install</code></li>
                           </ol>
                         </div>

                         <div>
                           <h6 className="text-sm font-semibold text-gray-700 mb-1">Method 3: Direct Download</h6>
                           <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                             <li>Go to your forked repository on GitHub (the URL with your username)</li>
                             <li>Click the green "Code" button</li>
                             <li>Select "Download ZIP"</li>
                             <li>Extract the ZIP file to a folder on your computer</li>
                             <li>Open the extracted folder in your code editor</li>
                             <li>Open terminal in your editor and run: <code className="bg-gray-200 px-1 rounded">npm install</code></li>
                           </ol>
                         </div>
                       </div>
                     </div>

                     <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                       <h6 className="text-sm font-semibold text-blue-800 mb-2">💡 Important Notes:</h6>
                       <ul className="text-xs text-blue-700 space-y-1">
                         <li>• <strong>Always fork first</strong> - This creates your own copy that you can modify</li>
                         <li>• <strong>Use your forked URL</strong> - The clone URL should have your username, not "ryz3006"</li>
                         <li>• <strong>Keep your fork updated</strong> - You can sync changes from the original project later</li>
                         <li>• <strong>Make sure you have Node.js installed</strong> (download from nodejs.org)</li>
                         <li>• <strong>Use VS Code</strong> - It's the best code editor for beginners</li>
                       </ul>
                     </div>
                   </div>
                 </div>

                {/* Step 2: Firebase Authentication Setup */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Step 2: Firebase Authentication Setup</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Firebase is Google's platform that handles user authentication (login/signup) for your app. This step will set up user login functionality.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-md font-semibold text-gray-800 mb-2">Step 2A: Create a Firebase Project</h5>
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
                          {' '}and sign in with your Google account
                        </li>
                        <li>Click "Create a project" or "Add project"</li>
                        <li>Enter a project name (e.g., "My Alignzo App")</li>
                        <li>Choose whether to enable Google Analytics (recommended: Yes)</li>
                        <li>Click "Create project" and wait for it to be set up</li>
                        <li>Click "Continue" when the setup is complete</li>
                      </ol>
                    </div>

                    <div>
                      <h5 className="text-md font-semibold text-gray-800 mb-2">Step 2B: Enable Authentication</h5>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>In the Firebase console, click "Authentication" in the left sidebar</li>
                        <li>Click "Get started" or "Set up sign-in method"</li>
                        <li>Click on the "Sign-in method" tab</li>
                        <li>Find "Google" in the list and click on it</li>
                        <li>Click the toggle switch to "Enable" Google sign-in</li>
                        <li>Enter a project support email (your email address)</li>
                        <li>Click "Save"</li>
                      </ol>
                    </div>

                    <div>
                      <h5 className="text-md font-semibold text-gray-800 mb-2">Step 2C: Create a Web App</h5>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>In the Firebase console, click the gear icon (⚙️) next to "Project Overview"</li>
                        <li>Select "Project settings" from the dropdown</li>
                        <li>Scroll down to the "Your apps" section</li>
                        <li>Click the web icon (&lt;/&gt;) to add a web app</li>
                        <li>Enter a nickname for your app (e.g., "Alignzo Web App")</li>
                        <li>Check "Also set up Firebase Hosting" (optional but recommended)</li>
                        <li>Click "Register app"</li>
                        <li>Copy the configuration object that appears - it looks like this:</li>
                      </ol>
                      <div className="bg-gray-100 p-3 rounded-md mt-2 text-xs">
                        <code>
                          const firebaseConfig = {'{'}<br />
                          &nbsp;&nbsp;apiKey: "your-api-key",<br />
                          &nbsp;&nbsp;authDomain: "your-project.firebaseapp.com",<br />
                          &nbsp;&nbsp;projectId: "your-project-id",<br />
                          &nbsp;&nbsp;storageBucket: "your-project.appspot.com",<br />
                          &nbsp;&nbsp;messagingSenderId: "123456789",<br />
                          &nbsp;&nbsp;appId: "your-app-id"<br />
                          {'}'};
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        <strong>Important:</strong> Save this configuration - you'll need it in Step 4!
                      </p>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <h6 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Security Note:</h6>
                      <p className="text-xs text-yellow-700">
                        The Firebase configuration contains public keys that are safe to include in your code. These keys are designed to be public and are not a security risk.
                      </p>
                    </div>
                  </div>
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
                                      SUPABASE_URL=https://your-project.supabase.co<br />
                SUPABASE_ANON_KEY=your-anon-key
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
