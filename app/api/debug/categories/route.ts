import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables not configured' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('project_categories')
      .select('id, name, project_id, created_at')
      .order('created_at', { ascending: false });
    
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: categoriesError },
        { status: 500 }
      );
    }
    
    // Get all category options
    const { data: options, error: optionsError } = await supabase
      .from('category_options')
      .select('id, option_name, category_id, created_at')
      .order('created_at', { ascending: false });
    
    if (optionsError) {
      console.error('Error fetching options:', optionsError);
      return NextResponse.json(
        { error: 'Failed to fetch options', details: optionsError },
        { status: 500 }
      );
    }
    
    // Check specific timeline category IDs
    const timelineCategoryIds = [
      '1353a294-12fd-49b6-8676-cc273130ca37',
      'bcdd4397-4939-4591-b2c4-347ab45e9c1c', 
      'fe9d976a-f33b-4221-9ee8-6edd4205bad7',
      '3ed6517f-c532-492d-9d7c-e7badfe307d7'
    ];
    
    const timelineOptionIds = [
      'd3e90e79-05ee-42c5-adb3-e0e90c16adcd',
      'bf11fc52-bd59-4b07-94f9-3a3817042eec',
      '1a7a55c3-3eac-410e-9290-4d50e7095ddd',
      'e377b73b-d150-4e0b-9576-09e7cc3ea50a',
      '7a052cb5-716c-4b43-9488-c6c5fbf6e273'
    ];
    
    const foundCategories = categories.filter(cat => timelineCategoryIds.includes(cat.id));
    const foundOptions = options.filter(opt => timelineOptionIds.includes(opt.id));
    
    return NextResponse.json({
      success: true,
      data: {
        totalCategories: categories.length,
        totalOptions: options.length,
        timelineCategoryIds,
        timelineOptionIds,
        foundCategories,
        foundOptions,
        missingCategories: timelineCategoryIds.filter(id => !categories.find(cat => cat.id === id)),
        missingOptions: timelineOptionIds.filter(id => !options.find(opt => opt.id === id)),
        allCategories: categories.slice(0, 10), // First 10 categories
        allOptions: options.slice(0, 10) // First 10 options
      }
    });
    
  } catch (error) {
    console.error('Error in debug categories API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
