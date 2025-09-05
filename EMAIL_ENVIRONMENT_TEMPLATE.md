# Email Environment Configuration

## Required Environment Variables

Add these environment variables to your `.env.local` file or deployment environment:

```bash
# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Optional: App URL for email links (used in email templates)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Provider-Specific Configurations

### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

**Note**: For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an "App Password" for this application
3. Use the app password (not your regular password)

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM=your-email@outlook.com
```

### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-email@yourdomain.com
```

### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM=your-email@yourdomain.com
```

### Amazon SES
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
SMTP_FROM=your-email@yourdomain.com
```

## Testing Your Configuration

1. **Copy the environment variables** to your `.env.local` file
2. **Fill in your actual SMTP credentials**
3. **Run the test script**:
   ```bash
   node test-email-notifications.js
   ```
4. **Test the API endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/kanban/test-email
   ```

## Security Notes

- Never commit your `.env.local` file to version control
- Use app-specific passwords when possible
- Consider using environment variables in production deployments
- Regularly rotate your SMTP credentials
