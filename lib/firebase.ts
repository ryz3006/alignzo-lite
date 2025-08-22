import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { supabaseClient } from './supabase-client';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  if (process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Connected to Firebase emulators');
    } catch (error) {
      console.log('Firebase emulators already connected or not available');
    }
  }
}

// Google provider for authentication
export const googleProvider = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET
};

// Firebase authentication wrapper
export class FirebaseAuth {
  private static instance: FirebaseAuth;

  private constructor() {}

  public static getInstance(): FirebaseAuth {
    if (!FirebaseAuth.instance) {
      FirebaseAuth.instance = new FirebaseAuth();
    }
    return FirebaseAuth.instance;
  }

  async syncUserToSupabase(firebaseUser: any): Promise<boolean> {
    try {
      if (!firebaseUser || !firebaseUser.email) {
        return false;
      }

      // Check if user already exists in Supabase
      const existingUser = await supabaseClient.get('users', {
        select: 'id',
        filters: { email: firebaseUser.email }
      });

      if (existingUser.error || !existingUser.data || existingUser.data.length === 0) {
        // Create new user in Supabase
        const newUser = {
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          firebase_uid: firebaseUser.uid,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const response = await supabaseClient.insert('users', newUser);
        if (response.error) {
          console.error('Error creating user in Supabase:', response.error);
          return false;
        }

        console.log('User synced to Supabase:', firebaseUser.email);
        return true;
      } else {
        // Update existing user
        const updateData = {
          firebase_uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const response = await supabaseClient.update('users', existingUser.data[0].id, updateData);
        if (response.error) {
          console.error('Error updating user in Supabase:', response.error);
          return false;
        }

        console.log('User updated in Supabase:', firebaseUser.email);
        return true;
      }
    } catch (error) {
      console.error('Error syncing user to Supabase:', error);
      return false;
    }
  }

  async getUserFromSupabase(firebaseUid: string): Promise<any> {
    try {
      const response = await supabaseClient.get('users', {
        select: '*',
        filters: { firebase_uid: firebaseUid }
      });

      if (response.error || !response.data || response.data.length === 0) {
        return null;
      }

      return response.data[0];
    } catch (error) {
      console.error('Error getting user from Supabase:', error);
      return null;
    }
  }

  async updateUserProfile(userId: string, profileData: any): Promise<boolean> {
    try {
      const response = await supabaseClient.update('users', userId, {
        ...profileData,
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.update('users', userId, {
        is_active: false,
        deactivated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error deactivating user:', error);
      return false;
    }
  }

  async reactivateUser(userId: string): Promise<boolean> {
    try {
      const response = await supabaseClient.update('users', userId, {
        is_active: true,
        deactivated_at: null,
        updated_at: new Date().toISOString()
      });

      return !response.error;
    } catch (error) {
      console.error('Error reactivating user:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Get user's team memberships
      const teamResponse = await supabaseClient.get('team_members', {
        select: 'teams!inner(role)',
        filters: { user_id: userId }
      });

      if (teamResponse.error || !teamResponse.data) {
        return [];
      }

      const permissions: string[] = [];
      
      // Add team-based permissions
      teamResponse.data.forEach((membership: any) => {
        if (membership.teams?.role) {
          permissions.push(`team_${membership.teams.role}`);
        }
      });

      // Check if user is admin
      const adminResponse = await supabaseClient.get('admin_users', {
        select: 'id',
        filters: { user_id: userId }
      });

      if (!adminResponse.error && adminResponse.data && adminResponse.data.length > 0) {
        permissions.push('admin');
      }

      return permissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  async logUserActivity(
    userId: string,
    activity: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabaseClient.insert('user_activities', {
        user_id: userId,
        activity,
        metadata,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }

  async getUserActivities(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const response = await supabaseClient.get('user_activities', {
        select: '*',
        filters: { user_id: userId },
        order: { column: 'created_at', ascending: false },
        limit,
        offset
      });

      if (response.error) {
        console.error('Error getting user activities:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error getting user activities:', error);
      return [];
    }
  }
}

// Global Firebase auth instance
export const firebaseAuth = FirebaseAuth.getInstance();

// Export Firebase app for other uses
export { app };

// Export Firebase services
export { auth as firebaseAuthInstance, db as firestore };
