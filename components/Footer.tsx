'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Github, 
  ExternalLink,
  Heart
} from 'lucide-react';

export default function Footer() {
  const [currentYear] = useState(new Date().getFullYear());

  return (
    <footer className="bg-neutral-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
                       <div className="flex items-center justify-center space-x-3 mb-4">
               <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-8 w-auto" />
               <img src="/ALIGNZO_Name.png" alt="Alignzo" className="h-6 w-auto" />
             </div>
          <p className="text-neutral-400 mb-6">
            Professional work log tracking and productivity monitoring platform designed for modern teams.
          </p>
          
          <div className="flex justify-center space-x-6 mb-6">
            <a
              href="https://github.com/ryz3006/alignzo-lite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors flex items-center space-x-2"
            >
              <Github className="h-5 w-5" />
              <span>View Source Code</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/ryz3006"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors flex items-center space-x-2"
            >
              <Github className="h-5 w-5" />
              <span>Developer Profile</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-neutral-400">
                             <span>&copy; {currentYear} All rights reserved.</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Made with</span>
              <Heart className="h-4 w-4 text-red-500 hidden sm:inline" />
              <span className="hidden sm:inline">for productive teams</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
