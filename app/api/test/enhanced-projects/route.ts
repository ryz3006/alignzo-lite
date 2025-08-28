import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email parameter is required' },
        { status: 400 }
      );
    }

    // Test the enhanced logic directly
    console.log(`[Test] Fetching projects for user: ${userEmail}`);

    // Get user's team memberships first
    const teamResponse = await supabaseClient.query({
      table: 'team_members',
      action: 'select',
      select: 'team_id',
      filters: { 'users.email': userEmail }
    });

    if (teamResponse.error) {
      throw new Error(teamResponse.error);
    }

    const userTeamIds = teamResponse.data?.map((membership: any) => membership.team_id) || [];
    console.log(`[Test] User team IDs:`, userTeamIds);

    if (userTeamIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get projects assigned to user's teams
    const projectResponse = await supabaseClient.query({
      table: 'team_project_assignments',
      action: 'select',
      select: 'project_id,projects(id,name,product,country,is_active)',
      filters: { team_id: userTeamIds }
    });

    if (projectResponse.error) {
      throw new Error(projectResponse.error);
    }

    console.log(`[Test] Project assignments:`, projectResponse.data);

    // Convert to ProjectWithCategories format
    const projectsWithCategories = await Promise.all(
      (projectResponse.data || []).map(async (assignment: any) => {
        const project = {
          id: assignment.project_id,
          name: assignment.projects?.name || 'Unknown Project',
          product: assignment.projects?.product || '',
          country: assignment.projects?.country || '',
          is_active: assignment.projects?.is_active !== false,
          created_at: assignment.projects?.created_at || new Date().toISOString(),
          updated_at: assignment.projects?.updated_at || new Date().toISOString(),
          categories: [],
          columns: []
        };

        try {
          console.log(`[Test] Loading categories for project: ${project.id}`);
          
          // Load categories for this project
          const categoriesResponse = await supabaseClient.query({
            table: 'project_categories',
            action: 'select',
            select: '*',
            filters: { project_id: project.id },
            order: { column: 'sort_order', ascending: true }
          });

          console.log(`[Test] Categories response for ${project.id}:`, categoriesResponse);

          if (!categoriesResponse.error && categoriesResponse.data) {
            // Load options for all categories
            const categoryIds = categoriesResponse.data.map((cat: any) => cat.id);
            let categoryOptions: any[] = [];
            
            if (categoryIds.length > 0) {
              console.log(`[Test] Loading options for categories:`, categoryIds);
              
              const optionsResponse = await supabaseClient.query({
                table: 'category_options',
                action: 'select',
                select: '*',
                filters: { category_id: categoryIds },
                order: { column: 'sort_order', ascending: true }
              });

              console.log(`[Test] Options response:`, optionsResponse);

              if (!optionsResponse.error && optionsResponse.data) {
                categoryOptions = optionsResponse.data;
              }
            }

            // Attach options to categories
            project.categories = categoriesResponse.data.map((category: any) => ({
              ...category,
              options: categoryOptions.filter((option: any) => option.category_id === category.id)
            }));
          }
        } catch (error) {
          console.warn(`[Test] Error loading categories for project ${project.id}:`, error);
          project.categories = [];
        }
        
        return project;
      })
    );

    console.log(`[Test] Final result:`, projectsWithCategories);

    return NextResponse.json(projectsWithCategories);
  } catch (error) {
    console.error('Error in test enhanced projects API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test projects' },
      { status: 500 }
    );
  }
}
