import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, signOut, User as FirebaseUser, Auth } from 'firebase/auth';
import { supabase } from './supabase';

export async function signInWithGoogle() {
  try {
    if (!auth || !googleProvider) {
      throw new Error('Firebase not initialized');
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
    // Check against environment variables instead of Firebase
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    
    console.log('Admin login attempt:', {
      inputEmail: email,
      inputPassword: password.length > 0 ? '***' : 'EMPTY',
      adminEmail,
      adminPassword: adminPassword ? '***' : 'NOT_SET',
      emailMatch: email === adminEmail,
      passwordMatch: password === adminPassword
    });
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not configured in environment variables');
    }
    
    if (email !== adminEmail || password !== adminPassword) {
      throw new Error('Invalid admin credentials');
    }
    
    // Store admin session in localStorage
    if (typeof window !== 'undefined') {
      const session = {
        email: adminEmail,
        loginTime: Date.now(),
        isAdmin: true
      };
      localStorage.setItem('admin_session', JSON.stringify(session));
      console.log('Admin session stored:', session);
    }
    
    return { email: adminEmail, isAdmin: true };
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
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', userEmail)
      .single();

    if (error) {
      console.error('Error checking user access:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}

export function isAdminUser(user?: FirebaseUser | null): boolean {
  // Check admin session first
  if (typeof window !== 'undefined') {
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
        return session.isAdmin && session.email === adminEmail;
      } catch (error) {
        console.error('Error parsing admin session:', error);
        localStorage.removeItem('admin_session');
      }
    }
  }
  
  // Fallback to Firebase user check
  if (!user) return false;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  return user.email === adminEmail;
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

export function getCurrentAdmin() {
  if (typeof window === 'undefined') return null;
  
  try {
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) return null;
    
    const session = JSON.parse(adminSession);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    
    if (session.isAdmin && session.email === adminEmail) {
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting current admin:', error);
    localStorage.removeItem('admin_session');
    return null;
  }
}
