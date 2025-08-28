// Client-safe version of enhanced user API
// This version uses fetch calls to API endpoints instead of direct Redis imports

import { getCurrentUser } from '@/lib/auth';

const API_BASE = '/api/user';

export async function getDashboardDataWithCache(): Promise<any> {
  try {
    // Get current user email
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      console.error('No authenticated user found');
      return null;
    }

    const response = await fetch(`${API_BASE}/dashboard-with-cache`, {
      headers: {
        'x-user-email': currentUser.email
      }
    });
    if (response.ok) {
      const result = await response.json();
      return result.success && result.data ? result.data : null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cached dashboard data:', error);
    return null;
  }
}

export async function getUserTeamsWithCache(): Promise<any[]> {
  try {
    // Get current user email
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      console.error('No authenticated user found');
      return [];
    }

    const response = await fetch(`${API_BASE}/teams-with-cache`, {
      headers: {
        'x-user-email': currentUser.email
      }
    });
    if (response.ok) {
      const result = await response.json();
      return result.success && result.data ? result.data : [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching cached user teams:', error);
    return [];
  }
}

export async function getUserShiftsWithCache(date?: string): Promise<any[]> {
  try {
    // Get current user email
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      console.error('No authenticated user found');
      return [];
    }

    const params = new URLSearchParams();
    if (date) params.append('date', date);
    
    const response = await fetch(`${API_BASE}/shifts-with-cache?${params}`, {
      headers: {
        'x-user-email': currentUser.email
      }
    });
    if (response.ok) {
      const result = await response.json();
      return result.success && result.data ? result.data : [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching cached user shifts:', error);
    return [];
  }
}

export async function getUserProjectsWithCache(): Promise<any[]> {
  try {
    // Get current user email
    const currentUser = await getCurrentUser();
    if (!currentUser?.email) {
      console.error('No authenticated user found');
      return [];
    }

    const response = await fetch(`${API_BASE}/projects-with-cache`, {
      headers: {
        'x-user-email': currentUser.email
      }
    });
    if (response.ok) {
      const result = await response.json();
      return result.success && result.data ? result.data : [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching cached user projects:', error);
    return [];
  }
}

// Cache invalidation functions (these call server APIs)
export async function invalidateUserCache(): Promise<void> {
  try {
    await fetch(`${API_BASE}/invalidate-cache`, { method: 'POST' });
  } catch (error) {
    console.error('Error invalidating user cache:', error);
  }
}

export async function invalidateUserShifts(): Promise<void> {
  try {
    await fetch(`${API_BASE}/invalidate-shifts`, { method: 'POST' });
  } catch (error) {
    console.error('Error invalidating user shifts:', error);
  }
}
