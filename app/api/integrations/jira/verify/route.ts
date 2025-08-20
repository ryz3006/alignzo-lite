import { NextRequest, NextResponse } from 'next/server';
import { verifyJiraCredentials } from '@/lib/jira';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_url, user_email, api_token } = body;

    if (!base_url || !user_email || !api_token) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const credentials = {
      base_url,
      user_email_integration: user_email,
      api_token
    };

    const result = await verifyJiraCredentials(credentials);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        user: result.user
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in JIRA verification:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
