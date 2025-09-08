import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, signOut, User as FirebaseUser, Auth } from 'firebase/auth';
import { supabaseClient } from './supabase-client';

export async function signInWithGoogle() {
  try {
    if (!auth || !googleProvider) {
      const error = new Error('Firebase not initialized. Please check your environment configuration.');
      console.error('Firebase authentication error:', error);
      throw error;
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function signInAsAdmin(email: string, password: string) {
  try {
    // Use server-side API route for admin authentication
    const response = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    if (data.success && data.admin) {
      // Store admin session in localStorage
      if (typeof window !== 'undefined') {
        const session = {
          email: data.admin.email,
          loginTime: Date.now(),
          isAdmin: true
        };
        localStorage.setItem('admin_session', JSON.stringify(session));
        console.log('Admin session stored:', session);
      }
      
      return data.admin;
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Error signing in as admin:', error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    // Clear admin session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_session');
    }
    
    // Also sign out from Firebase if available
    if (auth) {
      await signOut(auth);
    }
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function checkUserAccess(userEmail: string): Promise<boolean> {
  try {
    const response = await supabaseClient.get('users', {
      select: 'email',
      filters: { email: userEmail }
    });

    if (response.error) {
      console.error('Error checking user access:', response.error);
      return false;
    }

    return response.data && response.data.length > 0;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}

export async function getUserAccessControls(userEmail: string) {
  try {
    const response = await supabaseClient.get('users', {
      select: `
        access_dashboard,
        access_my_jira_tickets,
        access_work_report,
        access_team_work_reports,
        access_analytics,
        access_analytics_workload,
        access_analytics_project_health,
        access_analytics_tickets,
        access_analytics_operational,
        access_analytics_team_insights,
        access_analytics_remedy,
        access_upload_tickets,
        access_master_mappings,
        access_shift_schedule,
        access_integrations
      `,
      filters: { email: userEmail }
    });

    if (response.error) {
      console.error('Error getting user access controls for', userEmail, ':', response.error);
      // Return default access controls if user not found or error occurs
      return {
        access_dashboard: true,
        access_my_jira_tickets: false,
        access_work_report: false,
        access_team_work_reports: false,
        access_analytics: false,
        access_analytics_workload: false,
        access_analytics_project_health: false,
        access_analytics_tickets: false,
        access_analytics_operational: false,
        access_analytics_team_insights: false,
        access_analytics_remedy: false,
        access_upload_tickets: false,
        access_master_mappings: false,
        access_shift_schedule: false,
        access_integrations: false,
      };
    }

    // Get the first user (should be unique by email)
    const userData = response.data && response.data.length > 0 ? response.data[0] : null;

    if (!userData) {
      // Return default access controls if user not found
      return {
        access_dashboard: true,
        access_my_jira_tickets: false,
        access_work_report: false,
        access_team_work_reports: false,
        access_analytics: false,
        access_analytics_workload: false,
        access_analytics_project_health: false,
        access_analytics_tickets: false,
        access_analytics_operational: false,
        access_analytics_team_insights: false,
        access_analytics_remedy: false,
        access_upload_tickets: false,
        access_master_mappings: false,
        access_shift_schedule: false,
        access_integrations: false,
      };
    }

    // Ensure all boolean values are properly set
    const accessControls = {
      access_dashboard: userData?.access_dashboard ?? true,
      access_my_jira_tickets: userData?.access_my_jira_tickets ?? false,
      access_work_report: userData?.access_work_report ?? false,
      access_team_work_reports: userData?.access_team_work_reports ?? false,
      access_analytics: userData?.access_analytics ?? false,
      access_analytics_workload: userData?.access_analytics_workload ?? false,
      access_analytics_project_health: userData?.access_analytics_project_health ?? false,
      access_analytics_tickets: userData?.access_analytics_tickets ?? false,
      access_analytics_operational: userData?.access_analytics_operational ?? false,
      access_analytics_team_insights: userData?.access_analytics_team_insights ?? false,
      access_analytics_remedy: userData?.access_analytics_remedy ?? false,
      access_upload_tickets: userData?.access_upload_tickets ?? false,
      access_master_mappings: userData?.access_master_mappings ?? false,
      access_shift_schedule: userData?.access_shift_schedule ?? false,
      access_integrations: userData?.access_integrations ?? false,
    };

    return accessControls;
  } catch (error) {
    console.error('Error getting user access controls:', error);
    // Return default access controls on error
    return {
      access_dashboard: true,
      access_work_report: false,
      access_team_work_reports: false,
      access_analytics: false,
      access_analytics_workload: false,
      access_analytics_project_health: false,
      access_analytics_tickets: false,
      access_analytics_operational: false,
      access_analytics_team_insights: false,
      access_analytics_remedy: false,
      access_upload_tickets: false,
      access_master_mappings: false,
      access_shift_schedule: false,
      access_integrations: false,
    };
  }
}

export async function getUserIdFromEmail(userEmail: string): Promise<string | null> {
  try {
    const response = await supabaseClient.get('users', {
      select: 'id',
      filters: { email: userEmail }
    });

    if (response.error) {
      console.error('Error getting user ID from email:', response.error);
      return null;
    }

    const userData = response.data && response.data.length > 0 ? response.data[0] : null;
    return userData?.id || null;
  } catch (error) {
    console.error('Error getting user ID from email:', error);
    return null;
  }
}

export function isAdminUser(user?: FirebaseUser | null): boolean {
  // Check admin session first
  if (typeof window !== 'undefined') {
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        // Check if session is valid and not expired
        if (session.isAdmin && session.email && session.loginTime) {
          const sessionAge = Date.now() - session.loginTime;
          const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (sessionAge < maxSessionAge) {
            return true;
          } else {
            // Session expired, remove it
            localStorage.removeItem('admin_session');
          }
        }
      } catch (error) {
        console.error('Error parsing admin session:', error);
        localStorage.removeItem('admin_session');
      }
    }
  }
  
  // Fallback to Firebase user check (this would only work if admin email is in Firebase)
  if (!user) return false;
  
  // For now, we'll rely on the admin session check above
  // If you want to support Firebase admin users, you'd need to add them to Firebase Auth
  return false;
}

// Server-side version for API routes
export async function isAdminUserServer(userEmail: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  return userEmail === adminEmail;
}

export async function getCurrentUser() {
  if (!auth) {
    return null;
  }
  return new Promise<FirebaseUser | null>((resolve) => {
    const unsubscribe = auth!.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Server-side version for API routes
export async function getCurrentUserServer(request?: Request): Promise<{ email: string } | null> {
  // For now, we'll use a simple approach - extract user from headers
  // In production, you'd want to implement proper JWT token validation
  
  if (!request) {
    return null;
  }
  
  try {
    // Try to get user email from headers (set by client-side)
    const userEmail = request.headers.get('x-user-email') || 
                     request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (userEmail && userEmail !== 'anonymous') {
      return { email: userEmail };
    }
    
    // For development/testing, you can also check for a test user
    if (process.env.NODE_ENV === 'development') {
      const testUser = process.env.TEST_USER_EMAIL;
      if (testUser) {
        return { email: testUser };
      }
    }
    
    // For testing purposes, return a default user if no authentication is found
    // This should be removed in production
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return { email: 'test@example.com' };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current user on server:', error);
    return null;
  }
}

export function getCurrentAdmin() {
  if (typeof window === 'undefined') return null;
  
  try {
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) return null;
    
    const session = JSON.parse(adminSession);
    
    // Check if session is valid (has required fields and is recent)
    if (session.isAdmin && session.email && session.loginTime) {
      // Check if session is not expired (24 hours)
      const sessionAge = Date.now() - session.loginTime;
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (sessionAge < maxSessionAge) {
        return session;
      } else {
        // Session expired, remove it
        localStorage.removeItem('admin_session');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current admin:', error);
    localStorage.removeItem('admin_session');
    return null;
  }
}
