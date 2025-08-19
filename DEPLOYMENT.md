# Deployment Guide

## Environment Configuration

### 1. Development Environment (.env.local)

Create a `.env.local` file in your project root with the following content:

```env
# Admin Credentials
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-admin-password

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAchetEFS86mLMIWI9z4G1BYud3ZZDQsSs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=alignzolite.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=alignzolite
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=alignzolite.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=486557893156
NEXT_PUBLIC_FIREBASE_APP_ID=1:486557893156:web:99ae1b182af50a32b3ceb1
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-H1S2KRVPY1

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xyqptvpugoomfrlpbkhh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cXB0dnB1Z29vbWZybHBia2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTE3NDEsImV4cCI6MjA3MTE2Nzc0MX0.Pm98fpwVivR7l7zWnp_MGtDP-6ojB1psjDxJcesvg4U
```

### 2. GitHub Repository Secrets

To deploy to GitHub Pages, you need to add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click on **Secrets and variables** → **Actions**
4. Click **New repository secret** and add each of the following:

#### Admin Credentials:
- `ADMIN_EMAIL` = your-admin-email@example.com
- `ADMIN_PASSWORD` = your-admin-password

#### Firebase Configuration:
- `NEXT_PUBLIC_FIREBASE_API_KEY` = AIzaSyAchetEFS86mLMIWI9z4G1BYud3ZZDQsSs
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = alignzolite.firebaseapp.com
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = alignzolite
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = alignzolite.firebasestorage.app
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = 486557893156
- `NEXT_PUBLIC_FIREBASE_APP_ID` = 1:486557893156:web:99ae1b182af50a32b3ceb1
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` = G-H1S2KRVPY1

#### Supabase Configuration:
- `NEXT_PUBLIC_SUPABASE_URL` = https://xyqptvpugoomfrlpbkhh.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cXB0dnB1Z29vbWZybHBia2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTE3NDEsImV4cCI6MjA3MTE2Nzc0MX0.Pm98fpwVivR7l7zWnp_MGtDP-6ojB1psjDxJcesvg4U

## GitHub Pages Deployment

### 1. Enable GitHub Pages

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Choose **gh-pages** branch and **/(root)** folder
6. Click **Save**

### 2. Workflow Configuration

The GitHub workflow (`.github/workflows/deploy.yml`) is already configured to:

- Trigger on pushes to the `main` branch
- Install dependencies
- Build the application with environment variables
- Deploy to the `gh-pages` branch

### 3. Deploy

1. Push your code to the `main` branch
2. The workflow will automatically run and deploy your application
3. Your app will be available at: `https://yourusername.github.io/your-repo-name/`

## Alternative Deployment Options

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add the same environment variables in Vercel dashboard:
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add all the environment variables listed above
3. The application will automatically deploy on every push to the main branch
4. Vercel will use the `vercel.json` configuration for optimal deployment

**Note**: Vercel deployment uses server-side rendering, while GitHub Pages uses static export. The configuration automatically adapts based on the deployment platform.

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Add the same environment variables in Netlify dashboard
3. Set build command: `npm run build`
4. Set publish directory: `out`
5. Deploy automatically on every push

## Database Setup

Before using the application, make sure to:

1. Run the SQL migration in your Supabase SQL Editor:
   - Copy the content from `database/schema.sql`
   - Paste it in the Supabase SQL Editor
   - Execute the script

2. Set up Firebase Authentication:
   - Enable Google Sign-in provider
   - Add your domain to authorized domains

## Post-Deployment

1. Visit your deployed application
2. Go to `/admin` to set up the initial configuration
3. Add users, teams, and projects through the admin interface
4. Users can then access the application at the root URL

## Troubleshooting

### Common Issues:

1. **Build fails**: 
   - Check that all environment variables are set correctly in GitHub secrets
   - Ensure `package-lock.json` is committed to the repository
   - Verify Firebase version compatibility (using Firebase v9.23.0)

2. **Authentication not working**: Verify Firebase configuration and domain settings

3. **Database errors**: Ensure Supabase tables are created using the provided schema

4. **404 errors**: 
   - Make sure GitHub Pages is enabled and pointing to the `gh-pages` branch
   - Verify the workflow successfully generated `index.html` in the `out` directory

5. **Dependencies lock file error**: 
   - Run `npm install` locally to generate `package-lock.json`
   - Commit the `package-lock.json` file to the repository

6. **Vercel build errors**:
   - Ensure all environment variables are set in Vercel dashboard
   - Check that Firebase configuration is correct
   - Verify that the `vercel.json` file is present in the repository
   - The application automatically adapts between static export (GitHub Pages) and SSR (Vercel)

### Support:

- Check the GitHub Actions logs for build errors
- Verify environment variables are correctly set
- Ensure all dependencies are properly installed
- The workflow includes verification steps to check if `index.html` was generated
