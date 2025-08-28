import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase environment variables not configured!');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log('🔗 Linking categories to project:', projectId);

    // First, check if categories are already linked
    const { data: existingProjectCategories, error: existingError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (existingError) {
      console.error('❌ Error checking existing project categories:', existingError);
      return NextResponse.json({ error: 'Failed to check existing categories' }, { status: 500 });
    }

    if (existingProjectCategories && existingProjectCategories.length > 0) {
      console.log('✅ Categories are already linked to the project!');
      return NextResponse.json({ 
        message: 'Categories already linked',
        count: existingProjectCategories.length,
        categories: existingProjectCategories
      });
    }

    // Get the categories from the project-options API
    const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/categories/project-options?projectId=${projectId}`);
    const apiData = await response.json();

    if (!apiData.categories || apiData.categories.length === 0) {
      return NextResponse.json({ error: 'No categories found to link' }, { status: 404 });
    }

    console.log(`✅ Found ${apiData.categories.length} categories to link`);

    // Link each category to the project
    const linkedCategories = [];
    for (const category of apiData.categories) {
      console.log(`🔗 Linking category: ${category.name} (${category.id})`);

      const { data: linkResult, error: linkError } = await supabase
        .from('project_categories')
        .upsert({
          id: category.id,
          project_id: projectId,
          name: category.name,
          description: category.description || '',
          color: category.color || '#3B82F6',
          sort_order: category.sort_order || 0,
          is_active: true
        }, {
          onConflict: 'id'
        });

      if (linkError) {
        console.error(`❌ Error linking category ${category.name}:`, linkError);
        return NextResponse.json({ 
          error: `Failed to link category ${category.name}`,
          details: linkError.message
        }, { status: 500 });
      } else {
        console.log(`✅ Linked category ${category.name}`);
        linkedCategories.push(category);
      }
    }

    console.log('✅ Category linking completed!');

    // Verify the linking worked
    const { data: verifyCategories, error: verifyError } = await supabase
      .from('project_categories')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (verifyError) {
      console.error('❌ Error verifying categories:', verifyError);
      return NextResponse.json({ error: 'Failed to verify categories' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Categories linked successfully',
      linkedCount: linkedCategories.length,
      verifiedCount: verifyCategories?.length || 0,
      categories: verifyCategories
    });

  } catch (error) {
    console.error('❌ Error linking categories:', error);
    return NextResponse.json({ 
      error: 'Failed to link categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
