const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found!');
  console.log('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const createTeamProjectTable = async () => {
  try {
    console.log('🔄 Creating team_project_assignments table...');
    
    const sql = `
      -- Team-Project Assignment table
      CREATE TABLE IF NOT EXISTS team_project_assignments (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(team_id, project_id)
      );

      -- Create index for better performance
      CREATE INDEX IF NOT EXISTS idx_team_project_assignments_team_id ON team_project_assignments(team_id);
      CREATE INDEX IF NOT EXISTS idx_team_project_assignments_project_id ON team_project_assignments(project_id);

      -- Create trigger for updated_at
      CREATE TRIGGER update_team_project_assignments_updated_at BEFORE UPDATE ON team_project_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      -- Enable RLS
      ALTER TABLE team_project_assignments ENABLE ROW LEVEL SECURITY;

      -- Create policies for public read access
      CREATE POLICY "Allow public read access" ON team_project_assignments FOR SELECT USING (true);
      CREATE POLICY "Allow public insert access" ON team_project_assignments FOR INSERT WITH CHECK (true);
      CREATE POLICY "Allow public update access" ON team_project_assignments FOR UPDATE USING (true);
      CREATE POLICY "Allow public delete access" ON team_project_assignments FOR DELETE USING (true);
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Error creating table:', error);
      return;
    }

    console.log('✅ team_project_assignments table created successfully!');
    console.log('📋 You can now create projects and assign teams to them.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
};

createTeamProjectTable();
