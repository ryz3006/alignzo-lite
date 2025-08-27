import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
}

export class GoogleDriveService {
  private oauth2Client: any;
  private drive: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2();
  }

  async initialize() {
    try {
      // Get configuration from database
      const { data: config, error } = await supabase
        .from('google_drive_config')
        .select('client_id, client_secret')
        .single();

      if (error || !config) {
        throw new Error('Google Drive configuration not found');
      }

      // Set up OAuth2 client
      this.oauth2Client.setCredentials({
        client_id: config.client_id,
        client_secret: config.client_secret,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google-drive/auth/callback`,
      });

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      return true;
    } catch (error) {
      console.error('Error initializing Google Drive service:', error);
      throw error;
    }
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleAuthCallback(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      
      // Store tokens securely (you might want to encrypt these)
      await this.storeTokens(tokens);
      
      return tokens;
    } catch (error) {
      console.error('Error handling auth callback:', error);
      throw error;
    }
  }

  private async storeTokens(tokens: any) {
    try {
      const { error } = await supabase
        .from('google_drive_tokens')
        .upsert({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing tokens:', error);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  async loadStoredTokens() {
    try {
      const { data, error } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .single();

      if (error || !data) {
        return null;
      }

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date
      };
    } catch (error) {
      console.error('Error loading stored tokens:', error);
      return null;
    }
  }

  async ensureAuthenticated() {
    try {
      const tokens = await this.loadStoredTokens();
      
      if (!tokens) {
        throw new Error('No stored tokens found');
      }

      this.oauth2Client.setCredentials(tokens);

      // Check if token is expired and refresh if needed
      if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        await this.storeTokens(credentials);
        this.oauth2Client.setCredentials(credentials);
      }

      return true;
    } catch (error) {
      console.error('Error ensuring authentication:', error);
      throw error;
    }
  }

  async listFiles(folderId: string = 'root') {
    try {
      await this.ensureAuthenticated();

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,parents,webViewLink)',
        orderBy: 'name'
      });

      const files = response.data.files || [];
      
      // Separate folders and files
      const folders = files.filter((file: any) => file.mimeType === 'application/vnd.google-apps.folder');
      const regularFiles = files.filter((file: any) => file.mimeType !== 'application/vnd.google-apps.folder');

      return {
        folders,
        files: regularFiles
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  async getFolderPath(folderId: string) {
    try {
      await this.ensureAuthenticated();

      const breadcrumbs = [{ id: 'root', name: 'My Drive' }];
      
      if (folderId === 'root') {
        return { breadcrumbs };
      }

      let currentId = folderId;
      
      while (currentId !== 'root') {
        const response = await this.drive.files.get({
          fileId: currentId,
          fields: 'id,name,parents'
        });

        const file = response.data;
        breadcrumbs.unshift({ id: file.id, name: file.name });
        
        if (file.parents && file.parents.length > 0) {
          currentId = file.parents[0];
        } else {
          break;
        }
      }

      return { breadcrumbs };
    } catch (error) {
      console.error('Error getting folder path:', error);
      throw error;
    }
  }

  async uploadFile(file: Buffer, fileName: string, mimeType: string, folderId: string = 'root') {
    try {
      await this.ensureAuthenticated();

      const fileMetadata = {
        name: fileName,
        parents: folderId !== 'root' ? [folderId] : undefined
      };

      const media = {
        mimeType,
        body: file
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,size,modifiedTime'
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async createFolder(folderName: string, parentId: string = 'root') {
    try {
      await this.ensureAuthenticated();

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId !== 'root' ? [parentId] : undefined
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id,name,modifiedTime'
      });

      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async downloadFile(fileId: string) {
    try {
      await this.ensureAuthenticated();

      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      return response.data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  async deleteFiles(fileIds: string[]) {
    try {
      await this.ensureAuthenticated();

      const deletePromises = fileIds.map(fileId =>
        this.drive.files.delete({
          fileId: fileId
        })
      );

      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error deleting files:', error);
      throw error;
    }
  }

  async getFileInfo(fileId: string) {
    try {
      await this.ensureAuthenticated();

      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,modifiedTime,webViewLink'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
