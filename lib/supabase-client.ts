import { supabase } from './supabase';

// Safe Supabase client wrapper
export const safeSupabase = {
  from: (table: string) => {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }
    return supabase.from(table);
  },
  
  // Helper function to check if supabase is available
  isAvailable: () => !!supabase,
  
  // Helper function to get the client
  getClient: () => supabase,
};
