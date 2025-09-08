import { NextRequest, NextResponse } from 'next/server';
import { getJiraCredentials } from '@/lib/jira';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    const ticketKey = searchParams.get('ticketKey');

    if (!userEmail || !ticketKey) {
      return NextResponse.json(
        { error: 'User email and ticket key are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching transitions for ticket: ${ticketKey} for user: ${userEmail}`);

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      return NextResponse.json(
        { error: 'JIRA integration not found for this user' },
        { status: 404 }
      );
    }

    // Get available transitions for the ticket
    const response = await fetch(`${credentials.base_url}/rest/api/3/issue/${ticketKey}/transitions`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`JIRA API error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `JIRA API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform transitions to a simpler format
    const transitions = data.transitions?.map((transition: any) => ({
      id: transition.id,
      name: transition.name,
      to: transition.to?.name || transition.name,
      hasScreen: transition.hasScreen || false,
      isGlobal: transition.isGlobal || false,
      isInitial: transition.isInitial || false,
      isConditional: transition.isConditional || false
    })) || [];

    console.log(`✅ Found ${transitions.length} available transitions for ticket ${ticketKey}`);

    return NextResponse.json({
      success: true,
      transitions: transitions
    });

  } catch (error) {
    console.error('❌ Error fetching JIRA transitions:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userEmail, 
      ticketKey,
      transitionId,
      comment
    } = body;

    if (!userEmail || !ticketKey || !transitionId) {
      return NextResponse.json(
        { error: 'User email, ticket key, and transition ID are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Transitioning ticket: ${ticketKey} to transition: ${transitionId} for user: ${userEmail}`);

    // Get JIRA credentials for the user
    const credentials = await getJiraCredentials(userEmail);
    if (!credentials) {
      return NextResponse.json(
        { error: 'JIRA integration not found for this user' },
        { status: 404 }
      );
    }

    // Prepare the transition payload
    const transitionPayload = {
      transition: {
        id: transitionId
      }
    };

    // Execute the transition first
    const transitionResponse = await fetch(`${credentials.base_url}/rest/api/3/issue/${ticketKey}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transitionPayload)
    });

    if (!transitionResponse.ok) {
      const errorText = await transitionResponse.text();
      console.error(`JIRA transition API error ${transitionResponse.status}:`, errorText);
      return NextResponse.json(
        { error: `JIRA transition API error: ${transitionResponse.status}`, details: errorText },
        { status: transitionResponse.status }
      );
    }

    console.log(`✅ Successfully transitioned ticket ${ticketKey} to transition ${transitionId}`);

    // Add comment if provided (separate API call)
    if (comment && comment.trim()) {
      try {
        const commentPayload = {
          body: {
            version: 1,
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: comment.trim()
                  }
                ]
              }
            ]
          }
        };

        const commentResponse = await fetch(`${credentials.base_url}/rest/api/3/issue/${ticketKey}/comment`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.user_email_integration}:${credentials.api_token}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(commentPayload)
        });

        if (commentResponse.ok) {
          console.log(`✅ Successfully added comment to ticket ${ticketKey}`);
        } else {
          const commentErrorText = await commentResponse.text();
          console.error(`JIRA comment API error ${commentResponse.status}:`, commentErrorText);
          // Don't fail the whole operation if comment fails
        }
      } catch (commentError) {
        console.error('Error adding comment:', commentError);
        // Don't fail the whole operation if comment fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket status updated successfully'
    });

  } catch (error) {
    console.error('❌ Error transitioning JIRA ticket:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
