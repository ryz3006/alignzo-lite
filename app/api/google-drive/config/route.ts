import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('google_drive_config')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
    }

    return NextResponse.json({
      configured: !!data,
      hasConfig: !!data
    });
  } catch (error) {
    console.error('Error fetching Google Drive config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret } = await request.json();

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Client ID and Client Secret are required' }, { status: 400 });
    }

    // Hash the client secret for secure storage
    const saltRounds = 12;
    const hashedClientSecret = await bcrypt.hash(clientSecret, saltRounds);

    // Check if config already exists
    const { data: existingConfig } = await supabase
      .from('google_drive_config')
      .select('id')
      .single();

    if (existingConfig) {
      // Update existing config
      const { error } = await supabase
        .from('google_drive_config')
        .update({
          client_id: clientId,
          client_secret: hashedClientSecret,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id);

      if (error) {
        console.error('Error updating Google Drive config:', error);
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
      }
    } else {
      // Create new config
      const { error } = await supabase
        .from('google_drive_config')
        .insert({
          client_id: clientId,
          client_secret: hashedClientSecret,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating Google Drive config:', error);
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving Google Drive config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
