import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials } from '@/lib/jira';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 JIRA Debug Request for user: ${userEmail}`);

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      console.log(`❌ JIRA credentials not found for user: ${userEmail}`);
      return NextResponse.json(
        { error: 'JIRA integration not found for this user' },
        { status: 404 }
      );
    }

    console.log(`✅ JIRA credentials found for user: ${userEmail}`);
    console.log(`🔍 Credentials details:`, {
      base_url: credentials.base_url,
      user_email: credentials.user_email_integration,
      has_api_token: !!credentials.api_token
    });

    const debugInfo: any = {
      credentials: {
        base_url: credentials.base_url,
        user_email: credentials.user_email_integration,
        has_api_token: !!credentials.api_token
      },
      tests: {}
    };

    // Test 1: Verify credentials work
    console.log(`🔍 Test 1: Verifying JIRA credentials...`);
    try {
      const response = await fetch(`${credentials.base_url}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ JIRA credentials verified successfully');
        debugInfo.tests.credentials = {
          success: true,
          user: {
            displayName: userData.displayName,
            accountId: userData.accountId
          }
        };
      } else {
        console.log('❌ JIRA credentials verification failed');
        const errorText = await response.text();
        debugInfo.tests.credentials = {
          success: false,
          status: response.status,
          error: errorText
        };
      }
    } catch (error) {
      console.log('❌ Error verifying credentials:', error instanceof Error ? error.message : String(error));
      debugInfo.tests.credentials = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 2: Check if project CMPOPS exists
    console.log(`🔍 Test 2: Checking if project CMPOPS exists...`);
    try {
      const response = await fetch(`${credentials.base_url}/rest/api/3/project/CMPOPS`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const projectData = await response.json();
        console.log('✅ Project CMPOPS found');
        debugInfo.tests.project_cmpops = {
          success: true,
          project: {
            key: projectData.key,
            name: projectData.name
          }
        };
      } else {
        console.log('❌ Project CMPOPS not found');
        const errorText = await response.text();
        debugInfo.tests.project_cmpops = {
          success: false,
          status: response.status,
          error: errorText
        };
      }
    } catch (error) {
      console.log('❌ Error checking project CMPOPS:', error instanceof Error ? error.message : String(error));
      debugInfo.tests.project_cmpops = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 3: List available projects
    console.log(`🔍 Test 3: Listing available projects...`);
    try {
      const response = await fetch(`${credentials.base_url}/rest/api/3/project/search?maxResults=50`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const projectsData = await response.json();
        console.log(`📋 Found ${projectsData.values.length} projects`);
        
        const projects = projectsData.values.map((p: any) => ({
          key: p.key,
          name: p.name
        }));
        
        debugInfo.tests.available_projects = {
          success: true,
          count: projects.length,
          projects: projects
        };
        
        // Look for similar project keys
        const similarProjects = projects.filter((p: any) => 
          p.key.includes('CMP') || p.key.includes('OPS') || p.name.toLowerCase().includes('ops')
        );
        
        if (similarProjects.length > 0) {
          console.log('🔍 Similar projects found:');
          similarProjects.forEach((project: any) => {
            console.log(`  - ${project.key}: ${project.name}`);
          });
          debugInfo.tests.similar_projects = similarProjects;
        }
      } else {
        console.log('❌ Could not list projects');
        const errorText = await response.text();
        debugInfo.tests.available_projects = {
          success: false,
          status: response.status,
          error: errorText
        };
      }
    } catch (error) {
      console.log('❌ Error listing projects:', error instanceof Error ? error.message : String(error));
      debugInfo.tests.available_projects = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }

    // Test 4: Try searching for ticket 6882 in different ways
    console.log(`🔍 Test 4: Testing ticket search strategies...`);
    const searchTests = [
      { name: 'exact_key', jql: 'key = "CMPOPS-6882"' },
      { name: 'key_pattern', jql: 'key ~ "6882"' },
      { name: 'global_search', jql: 'text ~ "6882"' }
    ];

    for (const test of searchTests) {
      try {
        const response = await fetch(`${credentials.base_url}/rest/api/3/search?jql=${encodeURIComponent(test.jql)}&maxResults=5`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          debugInfo.tests[`search_${test.name}`] = {
            success: true,
            found: data.issues.length,
            tickets: data.issues.map((i: any) => i.key)
          };
        } else {
          const errorText = await response.text();
          debugInfo.tests[`search_${test.name}`] = {
            success: false,
            status: response.status,
            error: errorText
          };
        }
      } catch (error) {
        debugInfo.tests[`search_${test.name}`] = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    console.log('🎯 JIRA debug completed');
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('❌ JIRA debug error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
