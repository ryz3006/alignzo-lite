// =====================================================
// EMAIL SERVICE FOR KANBAN NOTIFICATIONS
// =====================================================

import nodemailer from 'nodemailer';
import { KanbanTask, User } from './kanban-types';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

// Email notification types
export type NotificationType = 'task_created' | 'task_updated' | 'task_deleted' | 'task_assigned';

// Email notification data interface
export interface EmailNotificationData {
  type: NotificationType;
  task: KanbanTask;
  assignee?: User;
  creator?: User;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  projectName?: string;
  columnName?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      console.log('🔧 Initializing email service...');
      
      // Get email configuration from environment variables
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || ''
      };

      // Log configuration details (mask sensitive info)
      console.log('📧 Email Configuration:');
      console.log(`   Host: ${config.host || '❌ NOT SET'}`);
      console.log(`   Port: ${config.port || '❌ NOT SET'}`);
      console.log(`   Secure: ${config.secure}`);
      console.log(`   User: ${config.user ? '✅ SET' : '❌ NOT SET'}`);
      console.log(`   Password: ${config.pass ? '✅ SET' : '❌ NOT SET'}`);
      console.log(`   From: ${config.from || '❌ NOT SET'}`);

      // Validate configuration
      const missingVars = [];
      if (!config.host) missingVars.push('SMTP_HOST');
      if (!config.user) missingVars.push('SMTP_USER');
      if (!config.pass) missingVars.push('SMTP_PASS');
      if (!config.from) missingVars.push('SMTP_FROM');

      if (missingVars.length > 0) {
        console.warn('⚠️ Email service not configured: Missing environment variables:', missingVars.join(', '));
        console.warn('   Please set these variables in your .env.local file or deployment environment');
        return;
      }

      this.config = config;

      // Create transporter with enhanced SSL/TLS configuration
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        },
        // Enhanced SSL/TLS configuration to handle various server requirements
        tls: {
          // Don't fail on invalid certs (useful for testing)
          rejectUnauthorized: false,
          // Support older TLS versions
          minVersion: 'TLSv1',
          // Allow legacy server support
          ciphers: 'SSLv3'
        },
        // Connection timeout
        connectionTimeout: 60000,
        // Socket timeout
        socketTimeout: 60000,
        // Greeting timeout
        greetingTimeout: 30000,
        // Debug mode for troubleshooting
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      });

      console.log('✅ Email service initialized successfully');
      console.log(`   SMTP Server: ${config.host}:${config.port} (${config.secure ? 'SSL/TLS' : 'STARTTLS'})`);
      console.log(`   From Address: ${config.from}`);
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  /**
   * Check if email service is properly configured
   */
  public isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  /**
   * Send email notification for Kanban task operations
   */
  public async sendTaskNotification(data: EmailNotificationData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Email service not configured, skipping notification');
      return false;
    }

    try {
      const { type, task, assignee, creator } = data;
      
      console.log(`📧 Preparing to send ${type} notification for task: "${task.title}"`);
      
      // Determine recipient
      const recipient = assignee || creator;
      if (!recipient || !recipient.email) {
        console.warn('⚠️ No valid recipient for email notification');
        console.warn(`   Task: ${task.title} (ID: ${task.id})`);
        console.warn(`   Assignee: ${assignee ? assignee.email : 'None'}`);
        console.warn(`   Creator: ${creator ? creator.email : 'None'}`);
        return false;
      }

      console.log(`📬 Email recipient: ${recipient.email}`);
      console.log(`👤 Recipient name: ${recipient.full_name || 'Unknown'}`);

      // Generate email content
      const emailContent = this.generateEmailContent(data);
      
      console.log(`📝 Email subject: "${emailContent.subject}"`);
      console.log(`📄 Email content generated (HTML: ${emailContent.html.length} chars, Text: ${emailContent.text.length} chars)`);

      // Send email with fallback configuration
      console.log(`🚀 Sending email via SMTP to ${recipient.email}...`);
      
      try {
        const info = await this.transporter!.sendMail({
          from: this.config!.from,
          to: recipient.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        console.log(`✅ Email notification sent successfully!`);
        console.log(`   📧 To: ${recipient.email}`);
        console.log(`   📋 Subject: "${emailContent.subject}"`);
        console.log(`   🆔 Message ID: ${info.messageId}`);
        console.log(`   📊 Response: ${info.response}`);
        console.log(`   🎯 Task: "${task.title}" (${type})`);
        
        return true;
      } catch (smtpError: any) {
        // If SSL/TLS error, try with alternative configuration
        if (smtpError.code === 'ESOCKET' || smtpError.message?.includes('SSL') || smtpError.message?.includes('TLS')) {
          console.warn('⚠️ SSL/TLS error detected, trying alternative configuration...');
          return await this.sendWithFallbackConfig(data, emailContent, recipient);
        }
        throw smtpError;
      }
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      console.error(`   📧 To: ${data.assignee?.email || data.creator?.email || 'Unknown'}`);
      console.error(`   📋 Subject: ${this.generateEmailContent(data).subject}`);
      console.error(`   🎯 Task: "${data.task.title}" (${data.type})`);
      console.error(`   🔍 Error details:`, error);
      return false;
    }
  }

  /**
   * Send email with fallback SSL/TLS configuration
   */
  private async sendWithFallbackConfig(
    data: EmailNotificationData, 
    emailContent: { subject: string; html: string; text: string }, 
    recipient: User
  ): Promise<boolean> {
    // Try multiple SMTP configurations
    const configs = [
      // Config 1: Try with secure=false (STARTTLS)
      {
        name: 'STARTTLS (secure=false)',
        config: {
          host: this.config!.host,
          port: this.config!.port,
          secure: false,
          auth: { user: this.config!.user, pass: this.config!.pass },
          tls: { rejectUnauthorized: false }
        }
      },
      // Config 2: Try with secure=true (SSL/TLS)
      {
        name: 'SSL/TLS (secure=true)',
        config: {
          host: this.config!.host,
          port: this.config!.port,
          secure: true,
          auth: { user: this.config!.user, pass: this.config!.pass },
          tls: { rejectUnauthorized: false }
        }
      },
      // Config 3: Try with port 465 (SSL)
      {
        name: 'SSL on port 465',
        config: {
          host: this.config!.host,
          port: 465,
          secure: true,
          auth: { user: this.config!.user, pass: this.config!.pass },
          tls: { rejectUnauthorized: false }
        }
      },
      // Config 4: Try with port 25 (no encryption)
      {
        name: 'No encryption on port 25',
        config: {
          host: this.config!.host,
          port: 25,
          secure: false,
          auth: { user: this.config!.user, pass: this.config!.pass }
        }
      }
    ];

    for (const { name, config } of configs) {
      try {
        console.log(`🔄 Trying ${name} configuration...`);
        console.log(`   Host: ${config.host}:${config.port}`);
        console.log(`   Secure: ${config.secure}`);
        
        const fallbackTransporter = nodemailer.createTransport(config);

        const info = await fallbackTransporter.sendMail({
          from: this.config!.from,
          to: recipient.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        console.log(`✅ Email notification sent successfully with ${name}!`);
        console.log(`   📧 To: ${recipient.email}`);
        console.log(`   📋 Subject: "${emailContent.subject}"`);
        console.log(`   🆔 Message ID: ${info.messageId}`);
        console.log(`   🎯 Task: "${data.task.title}" (${data.type})`);
        
        return true;
      } catch (configError: any) {
        console.warn(`⚠️ ${name} failed:`, configError.message);
        continue;
      }
    }

    console.error('❌ All fallback email configurations failed');
    return false;
  }

  /**
   * Generate email content based on notification type
   */
  private generateEmailContent(data: EmailNotificationData): {
    subject: string;
    html: string;
    text: string;
  } {
    const { type, task, assignee, creator, changes, projectName, columnName } = data;
    
    // Generate subject line
    const subject = this.generateSubject(type, task, projectName);
    
    // Generate HTML content
    const html = this.generateHtmlContent(data);
    
    // Generate plain text content
    const text = this.generateTextContent(data);

    return { subject, html, text };
  }

  /**
   * Generate email subject line
   */
  private generateSubject(type: NotificationType, task: KanbanTask, projectName?: string): string {
    const project = projectName ? ` in ${projectName}` : '';
    
    switch (type) {
      case 'task_created':
        return `New Task Assigned: ${task.title}${project}`;
      case 'task_updated':
        return `Task Updated: ${task.title}${project}`;
      case 'task_deleted':
        return `Task Deleted: ${task.title}${project}`;
      case 'task_assigned':
        return `Task Assigned to You: ${task.title}${project}`;
      default:
        return `Task Notification: ${task.title}${project}`;
    }
  }

  /**
   * Generate HTML email content
   */
  private generateHtmlContent(data: EmailNotificationData): string {
    const { type, task, assignee, creator, changes, projectName, columnName } = data;
    
    const priorityColors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      urgent: '#DC2626'
    };

    const priorityLabels = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent'
    };

    const actionLabels = {
      task_created: 'created',
      task_updated: 'updated',
      task_deleted: 'deleted',
      task_assigned: 'assigned to you'
    };

    const actionColors = {
      task_created: '#10B981',
      task_updated: '#3B82F6',
      task_deleted: '#EF4444',
      task_assigned: '#8B5CF6'
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Notification</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 24px;
        }
        .task-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
        }
        .task-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 8px 0;
        }
        .task-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin: 12px 0;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: #6b7280;
        }
        .priority-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            color: white;
        }
        .description {
            margin: 16px 0;
            color: #4b5563;
            line-height: 1.5;
        }
        .changes-section {
            margin: 20px 0;
            padding: 16px;
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        }
        .changes-title {
            font-weight: 600;
            color: #92400e;
            margin: 0 0 12px 0;
        }
        .change-item {
            margin: 8px 0;
            font-size: 14px;
        }
        .change-field {
            font-weight: 500;
            color: #374151;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            color: #6b7280;
            font-size: 14px;
        }
        .action-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 500;
            margin: 16px 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .content {
                padding: 16px;
            }
            .task-meta {
                flex-direction: column;
                gap: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Task ${actionLabels[type]}</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">${projectName || 'Project'}</p>
        </div>
        
        <div class="content">
            <div class="task-card">
                <h2 class="task-title">${task.title}</h2>
                
                <div class="task-meta">
                    <div class="meta-item">
                        <span>📋</span>
                        <span>Priority: <span class="priority-badge" style="background-color: ${priorityColors[task.priority]}">${priorityLabels[task.priority]}</span></span>
                    </div>
                    ${columnName ? `
                    <div class="meta-item">
                        <span>📁</span>
                        <span>Column: ${columnName}</span>
                    </div>
                    ` : ''}
                    ${task.due_date ? `
                    <div class="meta-item">
                        <span>📅</span>
                        <span>Due: ${new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                    ` : ''}
                    ${task.estimated_hours ? `
                    <div class="meta-item">
                        <span>⏱️</span>
                        <span>Est. Hours: ${task.estimated_hours}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${task.description ? `
                <div class="description">
                    <strong>Description:</strong><br>
                    ${task.description.replace(/\n/g, '<br>')}
                </div>
                ` : ''}
                
                ${changes && changes.length > 0 ? `
                <div class="changes-section">
                    <h3 class="changes-title">Changes Made:</h3>
                    ${changes.map(change => `
                        <div class="change-item">
                            <span class="change-field">${change.field}:</span> 
                            ${change.oldValue || 'None'} → ${change.newValue || 'None'}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            ${type !== 'task_deleted' ? `
            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/alignzo/kanban-board" class="action-button">
                    View in Kanban Board
                </a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This is an automated notification from Alignzo Lite.</p>
            <p>If you have any questions, please contact your project administrator.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text email content
   */
  private generateTextContent(data: EmailNotificationData): string {
    const { type, task, assignee, creator, changes, projectName, columnName } = data;
    
    const actionLabels = {
      task_created: 'created',
      task_updated: 'updated',
      task_deleted: 'deleted',
      task_assigned: 'assigned to you'
    };

    let content = `Task ${actionLabels[type]}\n\n`;
    content += `Project: ${projectName || 'Unknown Project'}\n`;
    content += `Task: ${task.title}\n`;
    content += `Priority: ${task.priority.toUpperCase()}\n`;
    
    if (columnName) {
      content += `Column: ${columnName}\n`;
    }
    
    if (task.due_date) {
      content += `Due Date: ${new Date(task.due_date).toLocaleDateString()}\n`;
    }
    
    if (task.estimated_hours) {
      content += `Estimated Hours: ${task.estimated_hours}\n`;
    }
    
    if (task.description) {
      content += `\nDescription:\n${task.description}\n`;
    }
    
    if (changes && changes.length > 0) {
      content += `\nChanges Made:\n`;
      changes.forEach(change => {
        content += `- ${change.field}: ${change.oldValue || 'None'} → ${change.newValue || 'None'}\n`;
      });
    }
    
    content += `\n---\n`;
    content += `This is an automated notification from Alignzo Lite.\n`;
    content += `If you have any questions, please contact your project administrator.`;
    
    return content;
  }

  /**
   * Test email configuration
   */
  public async testConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Cannot test connection: Email service not configured');
      return false;
    }

    try {
      console.log('🧪 Testing SMTP connection...');
      console.log(`   Server: ${this.config!.host}:${this.config!.port}`);
      console.log(`   User: ${this.config!.user}`);
      console.log(`   Secure: ${this.config!.secure ? 'SSL/TLS' : 'STARTTLS'}`);
      
      const result = await this.transporter!.verify();
      
      console.log('✅ Email service connection test successful');
      console.log(`   📊 Connection result:`, result);
      console.log(`   🔗 SMTP server is reachable and credentials are valid`);
      
      return true;
    } catch (error) {
      console.error('❌ Email service connection test failed:');
      console.error(`   🔍 Error:`, error);
      console.error(`   📧 Server: ${this.config!.host}:${this.config!.port}`);
      console.error(`   👤 User: ${this.config!.user}`);
      console.error(`   🔐 Check your SMTP credentials and server settings`);
      
      return false;
    }
  }

  /**
   * Test multiple SMTP configurations to find the working one
   */
  public async testMultipleConfigurations(): Promise<{ success: boolean; workingConfig?: any }> {
    if (!this.config) {
      console.warn('⚠️ Cannot test configurations: Email service not configured');
      return { success: false };
    }

    console.log('🧪 Testing multiple SMTP configurations...');
    
    const configs = [
      {
        name: 'Current Configuration',
        config: {
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: { user: this.config.user, pass: this.config.pass },
          tls: { rejectUnauthorized: false }
        }
      },
      {
        name: 'STARTTLS (secure=false)',
        config: {
          host: this.config.host,
          port: 587,
          secure: false,
          auth: { user: this.config.user, pass: this.config.pass },
          tls: { rejectUnauthorized: false }
        }
      },
      {
        name: 'SSL/TLS (secure=true)',
        config: {
          host: this.config.host,
          port: 587,
          secure: true,
          auth: { user: this.config.user, pass: this.config.pass },
          tls: { rejectUnauthorized: false }
        }
      },
      {
        name: 'SSL on port 465',
        config: {
          host: this.config.host,
          port: 465,
          secure: true,
          auth: { user: this.config.user, pass: this.config.pass },
          tls: { rejectUnauthorized: false }
        }
      }
    ];

    for (const { name, config } of configs) {
      try {
        console.log(`🔄 Testing ${name}...`);
        console.log(`   Host: ${config.host}:${config.port}, Secure: ${config.secure}`);
        
        const testTransporter = nodemailer.createTransport(config);
        const result = await testTransporter.verify();
        
        console.log(`✅ ${name} works!`);
        console.log(`   📊 Result:`, result);
        
        return { success: true, workingConfig: { name, config } };
      } catch (error: any) {
        console.warn(`⚠️ ${name} failed:`, error.message);
        continue;
      }
    }

    console.error('❌ No working SMTP configuration found');
    return { success: false };
  }
}

// Export singleton instance
export const emailService = new EmailService();
