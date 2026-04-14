import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MatchingMetrics, ApiErrorResponse } from '@/types/matching';

// GET /api/matching/metrics - Get matching system metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Get matching sessions
    const sessions = await db.matchingSession.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      include: {
        candidates: true
      }
    });

    // Get assignments
    const assignments = await db.assignment.findMany({
      where: {
        assignedAt: { gte: startDate }
      }
    });

    // Calculate metrics
    const totalMatchings = sessions.length;
    const successfulMatchings = sessions.filter(s => s.status === 'COMPLETED').length;
    
    // Average matching time
    const completedSessions = sessions.filter(s => s.completedAt);
    const avgMatchingTime = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => 
          sum + (s.completedAt!.getTime() - s.createdAt.getTime()), 0) / completedSessions.length
      : 0;

    // Average candidates per matching
    const avgCandidatesPerMatching = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.candidates.length, 0) / sessions.length
      : 0;

    // Average match score
    const allCandidates = sessions.flatMap(s => s.candidates);
    const avgMatchScore = allCandidates.length > 0
      ? allCandidates.reduce((sum, c) => sum + c.score, 0) / allCandidates.length
      : 0;

    // Fraud blocks (candidates marked as not fraud safe)
    const fraudBlocks = allCandidates.filter(c => !c.fraudSafe).length;

    // International rejections
    const internationalRejections = allCandidates.filter(c => !c.internationalAllowed).length;

    // Auto assignments (from sessions with autoAssign = true)
    const autoAssignSessions = sessions.filter(s => s.autoAssign);
    const autoAssignments = autoAssignSessions.filter(s => s.status === 'COMPLETED').length;
    const autoAssignmentSuccessRate = autoAssignSessions.length > 0
      ? (autoAssignments / autoAssignSessions.length) * 100
      : 0;

    // Top rejection reasons (from expired candidates)
    const rejectedCandidates = allCandidates.filter(c => c.status === 'EXPIRED' || c.status === 'REJECTED');
    
    // Build rejection reasons from score breakdown
    const rejectionReasons: Map<string, number> = new Map();
    
    for (const candidate of rejectedCandidates) {
      if (!candidate.hardFilterPassed) {
        rejectionReasons.set('Hard Filter Failed', (rejectionReasons.get('Hard Filter Failed') || 0) + 1);
      }
      if (!candidate.fraudSafe) {
        rejectionReasons.set('Fraud Check Failed', (rejectionReasons.get('Fraud Check Failed') || 0) + 1);
      }
      if (!candidate.internationalAllowed) {
        rejectionReasons.set('International Not Allowed', (rejectionReasons.get('International Not Allowed') || 0) + 1);
      }
    }

    const topRejectionReasons = Array.from(rejectionReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const metrics: MatchingMetrics = {
      period,
      totalMatchings,
      successfulMatchings,
      avgMatchingTime: Math.round(avgMatchingTime),
      avgCandidatesPerMatching: Math.round(avgCandidatesPerMatching * 10) / 10,
      avgMatchScore: Math.round(avgMatchScore * 10) / 10,
      fraudBlocks,
      internationalRejections,
      autoAssignments,
      autoAssignmentSuccessRate: Math.round(autoAssignmentSuccessRate * 10) / 10,
      topRejectionReasons
    };

    return NextResponse.json(metrics, { status: 200 });

  } catch (error) {
    console.error('Get matching metrics error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to get matching metrics',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
