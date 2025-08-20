'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { supabase, Project, TicketSource, TicketUploadMapping, TicketUploadUserMapping, UploadSession, UploadedTicket } from '@/lib/supabase';
import { Upload, Plus, Download, RefreshCw, Eye, Trash2, Check, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectWithUsers extends Project {
  users: string[]; // Array of user emails
}

interface MappingWithDetails extends TicketUploadMapping {
  source: TicketSource;
  project: Project;
  user_mappings: TicketUploadUserMapping[];
}

export default function UploadTicketsPage() {
  const [sources, setSources] = useState<TicketSource[]>([]);
  const [projects, setProjects] = useState<ProjectWithUsers[]>([]);
  const [mappings, setMappings] = useState<MappingWithDetails[]>([]);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [uploadedTickets, setUploadedTickets] = useState<UploadedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination states for uploaded tickets
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(25);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [showTicketDetailsModal, setShowTicketDetailsModal] = useState(false);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<UploadedTicket | null>(null);
  
  // Modal states
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  // Form states
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [organizationField, setOrganizationField] = useState<string>('Assigned_Support_Organization');
  const [organizationValue, setOrganizationValue] = useState<string>('');
  const [userMappings, setUserMappings] = useState<Array<{ user_email: string; assignee_value: string }>>([]);
  
  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadSources(),
        loadProjects(),
        loadMappings(),
        loadUploadSessions(),
        loadUploadedTickets()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async () => {
    const { data, error } = await supabase
      .from('ticket_sources')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setSources(data || []);
  };

  const loadProjects = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.email) return;

      // Get all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (projectsError) throw projectsError;

      // Get team memberships for the current user
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          users!inner(*)
        `)
        .eq('users.email', currentUser.email);

      if (teamError) throw teamError;

      // Get projects assigned to user's teams
      const userTeamIds = teamMemberships?.map(membership => membership.team_id) || [];
      
      let projectIds: string[] = [];
      if (userTeamIds.length > 0) {
        const { data: assignedProjects, error: assignedError } = await supabase
          .from('team_project_assignments')
          .select('project_id')
          .in('team_id', userTeamIds);

        if (assignedError) throw assignedError;
        projectIds = assignedProjects?.map(assignment => assignment.project_id) || [];
      }

      // Get users for each project
      const projectsWithUsers = await Promise.all(
        (projectsData || []).map(async (project) => {
          let projectUserIds: string[] = [];
          
          if (projectIds.includes(project.id)) {
            // Get team members for teams assigned to this project
            const { data: projectTeams, error: projectTeamsError } = await supabase
              .from('team_project_assignments')
              .select('team_id')
              .eq('project_id', project.id);

            if (!projectTeamsError && projectTeams) {
              const teamIds = projectTeams.map(pt => pt.team_id);
              const { data: teamMembers, error: teamMembersError } = await supabase
                .from('team_members')
                .select(`
                  users!inner(*)
                `)
                .in('team_id', teamIds);

              if (!teamMembersError && teamMembers) {
                projectUserIds = teamMembers.map(tm => (tm.users as any).email).filter(Boolean);
              }
            }
          }

          return {
            ...project,
            users: projectUserIds
          };
        })
      );

      setProjects(projectsWithUsers);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadMappings = async () => {
    const { data, error } = await supabase
      .from('ticket_upload_mappings')
      .select(`
        *,
        source:ticket_sources(*),
        project:projects(*),
        user_mappings:ticket_upload_user_mappings(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setMappings(data || []);
  };

  const loadUploadSessions = async () => {
    const { data, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setUploadSessions(data || []);
  };

  const loadUploadedTickets = async () => {
    const { data, error } = await supabase
      .from('uploaded_tickets')
      .select(`
        *,
        source:ticket_sources(name),
        mapping:ticket_upload_mappings(
          project:projects(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setUploadedTickets(data || []);
  };

  const handleAddSource = async () => {
    if (!selectedSource || !selectedProject || !organizationValue.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Create mapping
      const { data: mapping, error: mappingError } = await supabase
        .from('ticket_upload_mappings')
        .insert({
          source_id: selectedSource,
          project_id: selectedProject,
          source_organization_field: organizationField,
          source_organization_value: organizationValue.trim()
        })
        .select()
        .single();

      if (mappingError) throw mappingError;

      // Create user mappings
      if (userMappings.length > 0) {
        const userMappingData = userMappings.map(um => ({
          mapping_id: mapping.id,
          user_email: um.user_email,
          source_assignee_field: 'Assignee',
          source_assignee_value: um.assignee_value.trim()
        }));

        const { error: userMappingError } = await supabase
          .from('ticket_upload_user_mappings')
          .insert(userMappingData);

        if (userMappingError) throw userMappingError;
      }

      toast.success('Source mapping created successfully');
      setShowMappingModal(false);
      resetMappingForm();
      loadMappings();
    } catch (error: any) {
      console.error('Error creating mapping:', error);
      toast.error(error.message || 'Failed to create mapping');
    }
  };

  const resetMappingForm = () => {
    setSelectedSource('');
    setSelectedProject('');
    setOrganizationValue('');
    setUserMappings([]);
  };

  const downloadSampleFile = () => {
    const headers = [
      'Incident ID', 'Priority', 'Region', 'Assigned_Support_Organization', 'Assigned_GROUP',
      'Vertical', 'Sub_Vertical', 'Owner_Support_Organization', 'Owner_GROUP', 'Owner',
      'Reported_source', 'User Name', 'Site_Group', 'Operational Category Tier 1',
      'Operational Category Tier 2', 'Operational Category Tier 3', 'Product_Name',
      'Product Categorization Tier 1', 'Product Categorization Tier 2', 'Product Categorization Tier 3',
      'Incident Type', 'Summary', 'Assignee', 'Reported_Date1', 'Responded_Date',
      'Last_Resolved_Date', 'Closed_Date', 'Status', 'Status_Reason_Hidden', 'Pending_Reason',
      'Group_Transfers', 'Total_Transfers', 'Department', 'VIP', 'Company', 'Vendor_Ticket_Number',
      'Reported_to_Vendor', 'Resolution', 'Resolver Group', 'Reopen Count', 'Re Opened Date',
      'Service Desk 1st Assigned Date', 'Service Desk 1st Assigned Group', 'Submitter',
      'Owner_Login_ID', 'Impact', 'Submit Date', 'Report Date', 'VIL_Function', 'IT_Partner', 'MTTR', 'MTTI'
    ];

         const sampleData = [
       'INC000097247868', 'SR', 'VF Idea SharedService Ltd', 'VIL', '6D CMP Operations Support',
       'Application Operation', 'Enterprise Business operations', 'Kyndryl - Service Desk', 'Kyndryl - Service Desk', 'Mahesh Sabale',
       'Email', 'Chetankumar Rathod', 'Ahmedabad', 'Central Application - cPOS', 'OTHERS', 'Bulk',
       '6D CMP', '6D CMP', 'All Enterprises', 'Service Request',
       'CMP_APN_WISE_TREND_AUG_25', 'Ganesh Zambre', '08/18/2025, 07:06:29 PM',
       '08/18/2025, 07:11:50 PM', '08/19/2025, 10:08:19 PM', '', 'Resolved',
       'No Further Action Required', 'Will check and update', 2, 3, 'Finance', 'No', 'VIL', '',
       'We have reviewed and confirmed that the trends we are sharing are accurate, as the data trends we are obtaining from our source OCS match the data provided in the sheet. Here isnt isnt Spike/Dip in the trends AS per our source OCS.', 'NON IBM', 0, '', '08/18/2025, 07:07:17 PM',
       'CIT-CPOS-CPOSSUPPORT', 'Remedy Application Service', 'cit3361872', '4-Minor/Localized', '08/18/2025, 07:06:29 PM',
       '08/18/2025, 07:06:29 PM', 'IT', '6D CMP', '02:58:25', '02:58:25'
     ];

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-ticket-dump.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (1MB limit)
    if (file.size > 1024 * 1024) {
      toast.error('File size must be less than 1MB');
      return;
    }

    // Validate file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setSelectedFile(file);
  };

  const addUserMapping = () => {
    setUserMappings([...userMappings, { user_email: '', assignee_value: '' }]);
  };

  const removeUserMapping = (index: number) => {
    setUserMappings(userMappings.filter((_, i) => i !== index));
  };

  const updateUserMapping = (index: number, field: 'user_email' | 'assignee_value', value: string) => {
    const updated = [...userMappings];
    updated[index][field] = value;
    setUserMappings(updated);
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this mapping? This will also delete all associated user mappings.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ticket_upload_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;
      toast.success('Mapping deleted successfully');
      loadMappings();
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      toast.error(error.message || 'Failed to delete mapping');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this upload session?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('upload_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      toast.success('Upload session deleted successfully');
      loadUploadSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error(error.message || 'Failed to delete session');
    }
  };

  const handleViewTicketDetails = (ticket: UploadedTicket) => {
    setSelectedTicketDetails(ticket);
    setShowTicketDetailsModal(true);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('uploaded_tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Ticket deleted successfully');
      loadUploadedTickets();
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast.error(error.message || 'Failed to delete ticket');
    }
  };

  const handleDeleteMultipleTickets = async () => {
    if (selectedTickets.length === 0) {
      toast.error('Please select tickets to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedTickets.length} tickets?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('uploaded_tickets')
        .delete()
        .in('id', selectedTickets);

      if (error) throw error;
      toast.success(`${selectedTickets.length} tickets deleted successfully`);
      setSelectedTickets([]);
      loadUploadedTickets();
    } catch (error: any) {
      console.error('Error deleting tickets:', error);
      toast.error(error.message || 'Failed to delete tickets');
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAllTickets = () => {
    const currentTickets = uploadedTickets.slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage);
    const currentTicketIds = currentTickets.map(ticket => ticket.id);
    
    if (selectedTickets.length === currentTicketIds.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(currentTicketIds);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSource) {
      toast.error('Please select a file and source');
      return;
    }

    try {
      setShowUploadModal(false);
      setShowProgressModal(true);

      // Create upload session
      const { data: session, error: sessionError } = await supabase
        .from('upload_sessions')
        .insert({
          user_email: (await getCurrentUser())?.email || '',
          source_id: selectedSource,
          file_name: selectedFile.name,
          total_rows: 0,
          processed_rows: 0,
          status: 'processing'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      setCurrentSession(session);

             // Read and process file
       const text = await selectedFile.text();
       const lines = text.split('\n');
       const headers = lines[0].split(',').map(h => h.trim());
       
       // Validate headers
       const requiredHeaders = [
         'Incident ID', 'Priority', 'Region', 'Assigned_Support_Organization', 'Assigned_GROUP',
         'Vertical', 'Sub_Vertical', 'Owner_Support_Organization', 'Owner_GROUP', 'Owner',
         'Reported_source', 'User Name', 'Site_Group', 'Operational Category Tier 1',
         'Operational Category Tier 2', 'Operational Category Tier 3', 'Product_Name',
         'Product Categorization Tier 1', 'Product Categorization Tier 2', 'Product Categorization Tier 3',
         'Incident Type', 'Summary', 'Assignee', 'Reported_Date1', 'Responded_Date',
         'Last_Resolved_Date', 'Closed_Date', 'Status', 'Status_Reason_Hidden', 'Pending_Reason',
         'Group_Transfers', 'Total_Transfers', 'Department', 'VIP', 'Company', 'Vendor_Ticket_Number',
         'Reported_to_Vendor', 'Resolution', 'Resolver Group', 'Reopen Count', 'Re Opened Date',
         'Service Desk 1st Assigned Date', 'Service Desk 1st Assigned Group', 'Submitter',
         'Owner_Login_ID', 'Impact', 'Submit Date', 'Report Date', 'VIL_Function', 'IT_Partner', 'MTTR', 'MTTI'
       ];

       const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
       if (missingHeaders.length > 0) {
         throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
       }

       // Helper function to parse CSV line with quoted fields
       const parseCSVLine = (line: string): string[] => {
         const result: string[] = [];
         let current = '';
         let inQuotes = false;
         
         for (let i = 0; i < line.length; i++) {
           const char = line[i];
           
           if (char === '"') {
             if (inQuotes && line[i + 1] === '"') {
               // Escaped quote
               current += '"';
               i++; // Skip next quote
             } else {
               // Toggle quote state
               inQuotes = !inQuotes;
             }
           } else if (char === ',' && !inQuotes) {
             // End of field
             result.push(current.trim());
             current = '';
           } else {
             current += char;
           }
         }
         
         // Add the last field
         result.push(current.trim());
         return result;
       };

       const totalRows = lines.length - 1; // Exclude header
       setUploadProgress({ current: 0, total: totalRows, status: 'Processing...' });

       // Update session with total rows
       await supabase
         .from('upload_sessions')
         .update({ total_rows: totalRows })
         .eq('id', session.id);

       // Process rows in batches
       const batchSize = 50;
       let processedRows = 0;

       for (let i = 1; i < lines.length; i += batchSize) {
         const batch = lines.slice(i, i + batchSize);
         const tickets = [];

         for (const line of batch) {
           if (!line.trim()) continue;

           const values = parseCSVLine(line);
           const ticket: any = {};

           headers.forEach((header, index) => {
             const value = values[index] || '';
             const fieldName = header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
             ticket[fieldName] = value;
           });

                     // Find matching mapping
           const mapping = mappings.find(m => 
             m.source_id === selectedSource && 
             m.source_organization_value === ticket.assigned_support_organization
           );

           if (mapping) {
             // Helper function to parse Remedy date format
             const parseRemedyDate = (dateString: string): string | null => {
               if (!dateString || dateString.trim() === '') return null;
               
               try {
                 // Handle Remedy format: "08/18/2025, 07:11:50 PM"
                 if (dateString.includes(',') && (dateString.includes('AM') || dateString.includes('PM'))) {
                   // Parse US date format with AM/PM
                   const date = new Date(dateString);
                   if (!isNaN(date.getTime())) {
                     return date.toISOString();
                   }
                 }
                 
                 // Fallback to standard date parsing
                 const date = new Date(dateString);
                 if (!isNaN(date.getTime())) {
                   return date.toISOString();
                 }
                 
                 return null;
               } catch (error) {
                 console.warn('Failed to parse date:', dateString, error);
                 return null;
               }
             };

             tickets.push({
               source_id: selectedSource,
               mapping_id: mapping.id,
               incident_id: ticket.incident_id,
               priority: ticket.priority,
               region: ticket.region,
               assigned_support_organization: ticket.assigned_support_organization,
               assigned_group: ticket.assigned_group,
               vertical: ticket.vertical,
               sub_vertical: ticket.sub_vertical,
               owner_support_organization: ticket.owner_support_organization,
               owner_group: ticket.owner_group,
               owner: ticket.owner,
               reported_source: ticket.reported_source,
               user_name: ticket.user_name,
               site_group: ticket.site_group,
               operational_category_tier_1: ticket.operational_category_tier_1,
               operational_category_tier_2: ticket.operational_category_tier_2,
               operational_category_tier_3: ticket.operational_category_tier_3,
               product_name: ticket.product_name,
               product_categorization_tier_1: ticket.product_categorization_tier_1,
               product_categorization_tier_2: ticket.product_categorization_tier_2,
               product_categorization_tier_3: ticket.product_categorization_tier_3,
               incident_type: ticket.incident_type,
               summary: ticket.summary,
               assignee: ticket.assignee,
               reported_date1: parseRemedyDate(ticket.reported_date1),
               responded_date: parseRemedyDate(ticket.responded_date),
               last_resolved_date: parseRemedyDate(ticket.last_resolved_date),
               closed_date: parseRemedyDate(ticket.closed_date),
               status: ticket.status,
               status_reason_hidden: ticket.status_reason_hidden,
               pending_reason: ticket.pending_reason,
               group_transfers: ticket.group_transfers ? parseInt(ticket.group_transfers) : null,
               total_transfers: ticket.total_transfers ? parseInt(ticket.total_transfers) : null,
               department: ticket.department,
               vip: ticket.vip === 'Yes',
               company: ticket.company,
               vendor_ticket_number: ticket.vendor_ticket_number,
               reported_to_vendor: ticket.reported_to_vendor === 'Yes',
               resolution: ticket.resolution,
               resolver_group: ticket.resolver_group,
               reopen_count: ticket.reopen_count ? parseInt(ticket.reopen_count) : null,
               reopened_date: parseRemedyDate(ticket.reopened_date),
               service_desk_1st_assigned_date: parseRemedyDate(ticket.service_desk_1st_assigned_date),
               service_desk_1st_assigned_group: ticket.service_desk_1st_assigned_group,
               submitter: ticket.submitter,
               owner_login_id: ticket.owner_login_id,
               impact: ticket.impact,
               submit_date: parseRemedyDate(ticket.submit_date),
               report_date: parseRemedyDate(ticket.report_date),
               vil_function: ticket.vil_function,
               it_partner: ticket.it_partner,
               mttr: ticket.mttr ? parseFloat(ticket.mttr) : null,
               mtti: ticket.mtti ? parseFloat(ticket.mtti) : null
             });
           }
        }

        if (tickets.length > 0) {
          const { error: insertError } = await supabase
            .from('uploaded_tickets')
            .insert(tickets);

          if (insertError) throw insertError;
        }

        processedRows += batch.length;
        setUploadProgress({ current: processedRows, total: totalRows, status: 'Processing...' });

        // Update session progress
        await supabase
          .from('upload_sessions')
          .update({ processed_rows: processedRows })
          .eq('id', session.id);
      }

      // Mark session as completed
      await supabase
        .from('upload_sessions')
        .update({ status: 'completed' })
        .eq('id', session.id);

      setUploadProgress({ current: totalRows, total: totalRows, status: 'Completed!' });
      toast.success(`Successfully uploaded ${processedRows} tickets`);
      
      setTimeout(() => {
        setShowProgressModal(false);
        setSelectedFile(null);
        setCurrentSession(null);
        setUploadProgress(null);
        loadUploadSessions();
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading file:', error);
      
      // Update session with error
      if (currentSession) {
        await supabase
          .from('upload_sessions')
          .update({ 
            status: 'failed', 
            error_message: error.message 
          })
          .eq('id', currentSession.id);
      }

      setUploadProgress({ current: 0, total: 0, status: 'Failed' });
      toast.error(error.message || 'Failed to upload file');
      
      setTimeout(() => {
        setShowProgressModal(false);
        setSelectedFile(null);
        setCurrentSession(null);
        setUploadProgress(null);
        loadUploadSessions();
      }, 3000);
    }
  };

  // Pagination calculations
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = uploadedTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(uploadedTickets.length / ticketsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Ticket Dumps</h1>
          <p className="text-gray-600">Upload and manage ticket data from external systems</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddSourceModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a new source
          </button>
          <button
            onClick={downloadSampleFile}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Sample
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </button>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Source Mappings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Source Mappings</h2>
          <p className="text-sm text-gray-600">Configure how external ticket data maps to your projects</p>
        </div>
        <div className="p-6">
          {mappings.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No source mappings</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new source mapping.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddSourceModal(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Add Source Mapping
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {mapping.source.name} → {mapping.project.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {mapping.source_organization_field}: {mapping.source_organization_value}
                          </p>
                        </div>
                      </div>
                      
                      {mapping.user_mappings.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">User Mappings:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {mapping.user_mappings.map((userMapping) => (
                              <div key={userMapping.id} className="text-gray-600">
                                {userMapping.user_email} ← {userMapping.source_assignee_value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete mapping"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

             {/* Upload Sessions */}
       <div className="bg-white rounded-lg shadow">
         <div className="px-6 py-4 border-b border-gray-200">
           <h2 className="text-lg font-medium text-gray-900">Upload History</h2>
           <p className="text-sm text-gray-600">Recent upload sessions and their status</p>
         </div>
         <div className="p-6">
           {uploadSessions.length === 0 ? (
             <div className="text-center py-8">
               <Upload className="mx-auto h-12 w-12 text-gray-400" />
               <h3 className="mt-2 text-sm font-medium text-gray-900">No upload sessions</h3>
               <p className="mt-1 text-sm text-gray-500">Upload your first ticket dump to get started.</p>
             </div>
           ) : (
             <div className="space-y-4">
               {uploadSessions.map((session) => (
                 <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                   <div className="flex justify-between items-center">
                     <div className="flex-1">
                       <h3 className="text-lg font-medium text-gray-900">{session.file_name}</h3>
                       <p className="text-sm text-gray-600">
                         {session.processed_rows} / {session.total_rows} rows processed
                       </p>
                       <div className="flex items-center space-x-4 mt-2">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                           session.status === 'completed' ? 'bg-green-100 text-green-800' :
                           session.status === 'failed' ? 'bg-red-100 text-red-800' :
                           'bg-yellow-100 text-yellow-800'
                         }`}>
                           {session.status}
                         </span>
                         <span className="text-sm text-gray-500">
                           {new Date(session.created_at).toLocaleString()}
                         </span>
                       </div>
                       {session.error_message && (
                         <p className="text-sm text-red-600 mt-1">{session.error_message}</p>
                       )}
                     </div>
                     
                     <div className="flex space-x-2">
                       <button
                         onClick={() => handleDeleteSession(session.id)}
                         className="text-red-600 hover:text-red-900"
                         title="Delete session"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
       </div>

       {/* Uploaded Ticket Entries */}
       <div className="bg-white rounded-lg shadow">
         <div className="px-6 py-4 border-b border-gray-200">
           <div className="flex justify-between items-center">
             <div>
               <h2 className="text-lg font-medium text-gray-900">Uploaded Ticket Entries</h2>
               <p className="text-sm text-gray-600">View and manage uploaded ticket data</p>
             </div>
             {selectedTickets.length > 0 && (
               <button
                 onClick={handleDeleteMultipleTickets}
                 className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Delete Selected ({selectedTickets.length})
               </button>
             )}
           </div>
         </div>
         <div className="p-6">
           {uploadedTickets.length === 0 ? (
             <div className="text-center py-8">
               <Upload className="mx-auto h-12 w-12 text-gray-400" />
               <h3 className="mt-2 text-sm font-medium text-gray-900">No uploaded tickets</h3>
               <p className="mt-1 text-sm text-gray-500">Upload your first ticket dump to see entries here.</p>
             </div>
           ) : (
             <div>
               {/* Table */}
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-gray-50">
                     <tr>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         <input
                           type="checkbox"
                           checked={selectedTickets.length === currentTickets.length && currentTickets.length > 0}
                           onChange={handleSelectAllTickets}
                           className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                         />
                       </th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported By</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {currentTickets.map((ticket) => (
                       <tr key={ticket.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4 whitespace-nowrap">
                           <input
                             type="checkbox"
                             checked={selectedTickets.includes(ticket.id)}
                             onChange={() => handleSelectTicket(ticket.id)}
                             className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                           />
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {(ticket as any).source?.name || 'Remedy'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {ticket.incident_id}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {new Date(ticket.created_at).toLocaleDateString()}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {ticket.user_name || '-'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {ticket.assignee || '-'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                           <div className="flex space-x-2">
                             <button
                               onClick={() => handleViewTicketDetails(ticket)}
                               className="text-blue-600 hover:text-blue-900"
                               title="View details"
                             >
                               <Eye className="h-4 w-4" />
                             </button>
                             <button
                               onClick={() => handleDeleteTicket(ticket.id)}
                               className="text-red-600 hover:text-red-900"
                               title="Delete ticket"
                             >
                               <Trash2 className="h-4 w-4" />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* Pagination */}
               {totalPages > 1 && (
                 <div className="flex items-center justify-between mt-6">
                   <div className="text-sm text-gray-700">
                     Showing {indexOfFirstTicket + 1} to {Math.min(indexOfLastTicket, uploadedTickets.length)} of {uploadedTickets.length} results
                   </div>
                   <div className="flex space-x-2">
                     <button
                       onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                       disabled={currentPage === 1}
                       className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Previous
                     </button>
                     <span className="px-3 py-2 text-sm font-medium text-gray-700">
                       Page {currentPage} of {totalPages}
                     </span>
                     <button
                       onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                       disabled={currentPage === totalPages}
                       className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Next
                     </button>
                   </div>
                 </div>
               )}
             </div>
           )}
         </div>
       </div>

      {/* Add Source Modal */}
      {showAddSourceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Ticket Source</h3>
                <button
                  onClick={() => setShowAddSourceModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a source</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddSourceModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedSource) {
                        setShowAddSourceModal(false);
                        setShowMappingModal(true);
                      } else {
                        toast.error('Please select a source');
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Configure Source Mapping</h3>
                <button
                  onClick={() => {
                    setShowMappingModal(false);
                    resetMappingForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <select
                    required
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Field Value
                  </label>
                  <input
                    type="text"
                    required
                    value={organizationValue}
                    onChange={(e) => setOrganizationValue(e.target.value)}
                    placeholder="Enter the value from Assigned_Support_Organization field"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This value should match what appears in the "Assigned_Support_Organization" column of your CSV file
                  </p>
                </div>

                {selectedProject && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        User Mappings
                      </label>
                      <button
                        type="button"
                        onClick={addUserMapping}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        + Add User Mapping
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {userMappings.map((mapping, index) => (
                        <div key={index} className="flex space-x-2">
                                                     <select
                             value={mapping.user_email}
                             onChange={(e) => updateUserMapping(index, 'user_email', e.target.value)}
                             className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                           >
                             <option value="">Select User</option>
                             {projects.find(p => p.id === selectedProject)?.users
                               .filter((user, index, arr) => arr.indexOf(user) === index) // Remove duplicates
                               .map(user => (
                                 <option key={user} value={user}>
                                   {user}
                                 </option>
                               ))}
                           </select>
                          <input
                            type="text"
                            value={mapping.assignee_value}
                            onChange={(e) => updateUserMapping(index, 'assignee_value', e.target.value)}
                            placeholder="Expected Assignee value"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeUserMapping(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowMappingModal(false);
                      resetMappingForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSource}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Create Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Ticket Dump</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a source</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum file size: 1MB. File must be in CSV format with exact headers.
                  </p>
                </div>

                {selectedFile && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || !selectedSource}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
                  <Upload className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Uploading Tickets</h3>
                
                {uploadProgress && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{uploadProgress.status}</span>
                      <span>{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% complete
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {showTicketDetailsModal && selectedTicketDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium">Ticket Details</h3>
              <button
                onClick={() => setShowTicketDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="space-y-2">
                  <div><span className="font-medium">Incident ID:</span> {selectedTicketDetails.incident_id}</div>
                  <div><span className="font-medium">Priority:</span> {selectedTicketDetails.priority || '-'}</div>
                  <div><span className="font-medium">Status:</span> {selectedTicketDetails.status || '-'}</div>
                  <div><span className="font-medium">Region:</span> {selectedTicketDetails.region || '-'}</div>
                  <div><span className="font-medium">Department:</span> {selectedTicketDetails.department || '-'}</div>
                  <div><span className="font-medium">Company:</span> {selectedTicketDetails.company || '-'}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Assignment</h4>
                <div className="space-y-2">
                  <div><span className="font-medium">Assigned Organization:</span> {selectedTicketDetails.assigned_support_organization || '-'}</div>
                  <div><span className="font-medium">Assigned Group:</span> {selectedTicketDetails.assigned_group || '-'}</div>
                  <div><span className="font-medium">Assignee:</span> {selectedTicketDetails.assignee || '-'}</div>
                  <div><span className="font-medium">Owner:</span> {selectedTicketDetails.owner || '-'}</div>
                  <div><span className="font-medium">Submitter:</span> {selectedTicketDetails.submitter || '-'}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-2">
                  <div><span className="font-medium">Reported Date:</span> {selectedTicketDetails.reported_date1 ? new Date(selectedTicketDetails.reported_date1).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Responded Date:</span> {selectedTicketDetails.responded_date ? new Date(selectedTicketDetails.responded_date).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Resolved Date:</span> {selectedTicketDetails.last_resolved_date ? new Date(selectedTicketDetails.last_resolved_date).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Closed Date:</span> {selectedTicketDetails.closed_date ? new Date(selectedTicketDetails.closed_date).toLocaleString() : '-'}</div>
                  <div><span className="font-medium">Created:</span> {new Date(selectedTicketDetails.created_at).toLocaleString()}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Metrics</h4>
                <div className="space-y-2">
                  <div><span className="font-medium">Group Transfers:</span> {selectedTicketDetails.group_transfers || '-'}</div>
                  <div><span className="font-medium">Total Transfers:</span> {selectedTicketDetails.total_transfers || '-'}</div>
                  <div><span className="font-medium">Reopen Count:</span> {selectedTicketDetails.reopen_count || '-'}</div>
                  <div><span className="font-medium">MTTR:</span> {selectedTicketDetails.mttr || '-'}</div>
                  <div><span className="font-medium">MTTI:</span> {selectedTicketDetails.mtti || '-'}</div>
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-medium text-gray-900 mb-3">Summary</h4>
                <div className="bg-gray-50 p-3 rounded-md">
                  {selectedTicketDetails.summary || 'No summary available'}
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-medium text-gray-900 mb-3">Resolution</h4>
                <div className="bg-gray-50 p-3 rounded-md">
                  {selectedTicketDetails.resolution || 'No resolution available'}
                </div>
              </div>
              
              <div className="col-span-2">
                <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-medium">User Name:</span> {selectedTicketDetails.user_name || '-'}</div>
                  <div><span className="font-medium">Site Group:</span> {selectedTicketDetails.site_group || '-'}</div>
                  <div><span className="font-medium">Vertical:</span> {selectedTicketDetails.vertical || '-'}</div>
                  <div><span className="font-medium">Sub Vertical:</span> {selectedTicketDetails.sub_vertical || '-'}</div>
                  <div><span className="font-medium">Incident Type:</span> {selectedTicketDetails.incident_type || '-'}</div>
                  <div><span className="font-medium">Impact:</span> {selectedTicketDetails.impact || '-'}</div>
                  <div><span className="font-medium">VIP:</span> {selectedTicketDetails.vip ? 'Yes' : 'No'}</div>
                  <div><span className="font-medium">Reported to Vendor:</span> {selectedTicketDetails.reported_to_vendor ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
