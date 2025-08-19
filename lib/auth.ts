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
    if (!auth) {
      throw new Error('Firebase not initialized');
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Error signing in as admin:', error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }
    await signOut(auth);
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

export function isAdminUser(user: FirebaseUser | null): boolean {
  if (!user) return false;
  
  const adminEmail = process.env.ADMIN_EMAIL;
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
