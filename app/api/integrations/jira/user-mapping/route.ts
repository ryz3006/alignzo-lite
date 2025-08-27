import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { supabaseClient } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || searchParams.get('integrationUserEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    // Get user's Jira user mappings
    const response = await supabaseClient.get('jira_user_mappings', {
      select: '*',
      filters: { 
        integration_user_email: userEmail
      }
    });

    if (response.error) {
      console.error('Error fetching Jira user mappings:', response.error);
      return NextResponse.json(
        { error: 'Failed to fetch user mappings' },
        { status: 500 }
      );
    }

    let mappings = response.data || [];

    // If no JIRA user mappings exist, try to create them from master mappings
    if (mappings.length === 0) {
      console.log('No JIRA user mappings found, attempting to create from master mappings...');
      
      try {
        // Get master mappings for JIRA source
        const masterMappingsResponse = await supabaseClient.get('ticket_master_mappings', {
          select: '*',
          filters: { 
            is_active: true
          }
        });

        if (masterMappingsResponse.data && masterMappingsResponse.data.length > 0) {
          // Get JIRA source ID
          const jiraSourceResponse = await supabaseClient.get('ticket_sources', {
            select: '*',
            filters: { 
              name: 'JIRA'
            }
          });

          if (jiraSourceResponse.data && jiraSourceResponse.data.length > 0) {
            const jiraSourceId = jiraSourceResponse.data[0].id;
            
            // Filter master mappings for JIRA source
            const jiraMasterMappings = masterMappingsResponse.data.filter(
              (mapping: any) => mapping.source_id === jiraSourceId
            );

            console.log('Found JIRA master mappings:', jiraMasterMappings.length);

            // Create JIRA user mappings from master mappings
            for (const masterMapping of jiraMasterMappings) {
              try {
                const userMappingData = {
                  user_email: masterMapping.mapped_user_email,
                  jira_assignee_name: masterMapping.source_assignee_value,
                  jira_reporter_name: masterMapping.source_assignee_value,
                  integration_user_email: userEmail
                };

                const createResponse = await supabaseClient.insert('jira_user_mappings', userMappingData);
                
                if (createResponse.data) {
                  console.log('Created JIRA user mapping for:', masterMapping.mapped_user_email);
                }
              } catch (error) {
                console.error('Error creating JIRA user mapping:', error);
                // Continue with other mappings even if one fails
              }
            }

            // Fetch the newly created mappings
            const updatedResponse = await supabaseClient.get('jira_user_mappings', {
              select: '*',
              filters: { 
                integration_user_email: userEmail
              }
            });

            if (updatedResponse.data) {
              mappings = updatedResponse.data;
              console.log('Successfully created and retrieved JIRA user mappings:', mappings.length);
            }
          }
        }
      } catch (error) {
        console.error('Error creating JIRA user mappings from master mappings:', error);
        // Don't fail the request, just return empty mappings
      }
    }

    return NextResponse.json({
      success: true,
      mappings: mappings
    });

  } catch (error) {
    console.error('Error in Jira user mappings API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update user mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      user_email, 
      jira_assignee_name, 
      jira_reporter_name, 
      jira_project_key, 
      integration_user_email 
    } = body;

    if (!user_email || !jira_assignee_name || !integration_user_email) {
      return NextResponse.json(
        { error: 'User email, JIRA assignee name, and integration user email are required' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const { data: existingMappings, error: checkError } = await supabaseClient
      .get('jira_user_mappings', {
        select: 'id',
        filters: {
          user_email: user_email,
          jira_project_key: jira_project_key || null,
          integration_user_email: integration_user_email
        }
      });

    if (checkError) {
      console.error('Error checking existing mapping:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing mapping' },
        { status: 500 }
      );
    }

    const existingMapping = existingMappings && existingMappings.length > 0 ? existingMappings[0] : null;

    let result;
    if (existingMapping) {
      // Update existing mapping
      const response = await supabaseClient.update('jira_user_mappings', existingMapping.id, {
        jira_assignee_name: jira_assignee_name,
        jira_reporter_name: jira_reporter_name,
        updated_at: new Date().toISOString()
      });

      if (response.error) throw new Error(response.error);
      result = response.data;
    } else {
      // Create new mapping
      const response = await supabaseClient.insert('jira_user_mappings', {
        user_email: user_email,
        jira_assignee_name: jira_assignee_name,
        jira_reporter_name: jira_reporter_name,
        jira_project_key: jira_project_key,
        integration_user_email: integration_user_email
      });

      if (response.error) throw new Error(response.error);
      result = response.data;
    }

    return NextResponse.json({
      message: existingMapping ? 'User mapping updated successfully' : 'User mapping created successfully',
      mapping: result
    });
  } catch (error) {
    console.error('Error saving user mapping:', error);
    return NextResponse.json(
      { error: `Failed to save user mapping: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// DELETE - Remove user mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mappingId');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    // Delete mapping
    const response = await supabaseClient.delete('jira_user_mappings', mappingId);

    if (response.error) {
      console.error('Error deleting user mapping:', response.error);
      return NextResponse.json(
        { error: 'Failed to delete user mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user mapping:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
