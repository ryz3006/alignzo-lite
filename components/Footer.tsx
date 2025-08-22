'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink,
  Heart,
  Shield,
  Zap,
  Users
} from 'lucide-react';

export default function Footer() {
  const [currentYear] = useState(new Date().getFullYear());

  const footerLinks = {
    product: [
      { name: 'Features', href: '#', description: 'Time tracking, analytics, team management' },
      { name: 'Pricing', href: '#', description: 'Flexible plans for teams of all sizes' },
      { name: 'Security', href: '#', description: 'Enterprise-grade security & compliance' },
      { name: 'API', href: '#', description: 'Integrate with your existing tools' },
    ],
    company: [
      { name: 'About', href: '#', description: 'Learn about our mission and values' },
      { name: 'Blog', href: '#', description: 'Latest insights and updates' },
      { name: 'Careers', href: '#', description: 'Join our growing team' },
      { name: 'Press', href: '#', description: 'Media resources and press kit' },
    ],
    support: [
      { name: 'Help Center', href: '#', description: 'Find answers to common questions' },
      { name: 'Contact Us', href: '#', description: 'Get in touch with our support team' },
      { name: 'Status', href: '#', description: 'Check system status and uptime' },
      { name: 'Documentation', href: '#', description: 'Developer guides and API docs' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '#', description: 'How we protect your data' },
      { name: 'Terms of Service', href: '#', description: 'Our terms and conditions' },
      { name: 'Cookie Policy', href: '#', description: 'How we use cookies' },
      { name: 'GDPR', href: '#', description: 'Data protection compliance' },
    ],
  };

  const socialLinks = [
    { name: 'GitHub', href: '#', icon: Github },
    { name: 'Twitter', href: '#', icon: Twitter },
    { name: 'LinkedIn', href: '#', icon: Linkedin },
    { name: 'Email', href: 'mailto:support@alignzo.com', icon: Mail },
  ];

  const contactInfo = [
    { icon: Mail, text: 'support@alignzo.com', href: 'mailto:support@alignzo.com' },
    { icon: Phone, text: '+1 (555) 123-4567', href: 'tel:+15551234567' },
    { icon: MapPin, text: 'San Francisco, CA', href: '#' },
  ];

  return (
    <footer className="bg-neutral-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-6 gap-12">
          {/* Brand Section */}
          <div className="xl:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <img src="/alinzo_logo.png" alt="Alignzo Logo" className="h-10 w-auto" />
              <span className="text-2xl font-bold">Alignzo</span>
            </div>
            <p className="text-neutral-400 mb-6 leading-relaxed">
              Professional work log tracking and productivity monitoring platform designed for modern teams. 
              Streamline your workflow and boost team performance with our comprehensive suite of tools.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-8">
              {contactInfo.map((contact, index) => (
                <a
                  key={index}
                  href={contact.href}
                  className="flex items-center space-x-3 text-neutral-400 hover:text-white transition-colors"
                >
                  <contact.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{contact.text}</span>
                </a>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 rounded-xl flex items-center justify-center transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Product</h3>
            <ul className="space-y-4">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{link.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{link.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Company</h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{link.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{link.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Support</h3>
            <ul className="space-y-4">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{link.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{link.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Legal</h3>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-neutral-400 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{link.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{link.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Features Highlight */}
        <div className="mt-16 pt-8 border-t border-neutral-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Lightning Fast</h4>
                <p className="text-sm text-neutral-400">Optimized for speed and performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Enterprise Secure</h4>
                <p className="text-sm text-neutral-400">Bank-level security and compliance</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Team Focused</h4>
                <p className="text-sm text-neutral-400">Built for collaboration and productivity</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-neutral-400">
              <span>&copy; {currentYear} Alignzo. All rights reserved.</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Made with</span>
              <Heart className="h-4 w-4 text-red-500 hidden sm:inline" />
              <span className="hidden sm:inline">for productive teams</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <Link href="#" className="text-neutral-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-neutral-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-neutral-400 hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
