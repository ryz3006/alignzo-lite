import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAdminAuditDynamic } from '@/lib/api-audit-wrapper';
import { AuditEventType } from '@/lib/audit-trail';
import { applyRateLimit, authLimiterConfig, addRateLimitHeaders } from '@/lib/rate-limit';
import { isAdminUserServer } from '@/lib/auth';

export const POST = withAdminAuditDynamic(AuditEventType.UPDATE)(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request, authLimiterConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Check admin authentication via session or header
    const adminEmail = request.headers.get('x-admin-email') || 
                      request.headers.get('x-user-email') ||
                      extractUserEmail(request);
    
    if (!adminEmail || adminEmail === 'anonymous') {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }
    
    // Verify admin credentials
    const isAdmin = await isAdminUserServer(adminEmail);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const alertId = params.id;

    // Update the alert to resolved
    const { data, error } = await supabase
      .from('security_alerts')
      .update({
        resolved: true,
        resolved_by: adminEmail,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const response = NextResponse.json({
      success: true,
      message: 'Alert resolved successfully',
      alert: data,
    });

    return addRateLimitHeaders(response, request, authLimiterConfig);

  } catch (error) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
});

// Helper function to extract user email
function extractUserEmail(request: NextRequest): string {
  const searchParams = new URL(request.url).searchParams;
  return searchParams.get('userEmail') || 
         request.headers.get('x-user-email') || 
         'anonymous';
}
