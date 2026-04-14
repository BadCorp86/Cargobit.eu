import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MatchingLogsResponse, MatchingLog, ApiErrorResponse } from '@/types/matching';

// GET /api/matching/logs/[transportId] - Get matching logs for a transport
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transportId: string }> }
) {
  try {
    const { transportId } = await params;

    // Get matching sessions
    const sessions = await db.matchingSession.findMany({
      where: { transportId },
      orderBy: { createdAt: 'desc' },
      include: {
        candidates: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (sessions.length === 0) {
      return NextResponse.json<MatchingLogsResponse>({
        transportId,
        logs: [],
        total: 0
      }, { status: 200 });
    }

    // Build logs from sessions
    const logs: MatchingLog[] = [];

    for (const session of sessions) {
      // Session start
      logs.push({
        id: `log_${session.id}_start`,
        matchingId: session.id,
        transportId,
        event: 'MATCHING_STARTED',
        timestamp: session.createdAt.toISOString(),
        metadata: {
          autoAssign: session.autoAssign
        }
      });

      // Candidate events
      let candidatesFound = 0;
      let bestScore = 0;

      for (const candidate of session.candidates) {
        candidatesFound++;
        if (candidate.score > bestScore) bestScore = candidate.score;

        logs.push({
          id: `log_${candidate.id}_found`,
          matchingId: session.id,
          transportId,
          event: 'CANDIDATE_FOUND',
          timestamp: candidate.createdAt.toISOString(),
          score: candidate.score,
          metadata: {
            driverId: candidate.driverId,
            vehicleId: candidate.vehicleId,
            hardFilterPassed: candidate.hardFilterPassed,
            fraudSafe: candidate.fraudSafe
          }
        });

        // Status changes
        if (candidate.status === 'NOTIFIED') {
          logs.push({
            id: `log_${candidate.id}_notified`,
            matchingId: session.id,
            transportId,
            event: 'CANDIDATE_NOTIFIED',
            timestamp: candidate.notifiedAt?.toISOString() || candidate.createdAt.toISOString(),
            metadata: { driverId: candidate.driverId }
          });
        }

        if (candidate.status === 'ACCEPTED') {
          logs.push({
            id: `log_${candidate.id}_accepted`,
            matchingId: session.id,
            transportId,
            event: 'CANDIDATE_ACCEPTED',
            timestamp: candidate.updatedAt.toISOString(),
            score: candidate.score
          });
        }

        if (candidate.status === 'REJECTED') {
          logs.push({
            id: `log_${candidate.id}_rejected`,
            matchingId: session.id,
            transportId,
            event: 'CANDIDATE_REJECTED',
            timestamp: candidate.updatedAt.toISOString()
          });
        }
      }

      // Session completion
      if (session.completedAt || session.status === 'COMPLETED') {
        logs.push({
          id: `log_${session.id}_complete`,
          matchingId: session.id,
          transportId,
          event: 'MATCHING_COMPLETED',
          timestamp: session.completedAt?.toISOString() || session.updatedAt.toISOString(),
          duration: session.completedAt 
            ? session.completedAt.getTime() - session.createdAt.getTime() 
            : undefined,
          candidatesFound,
          score: bestScore
        });
      }

      if (session.status === 'STOPPED') {
        logs.push({
          id: `log_${session.id}_stopped`,
          matchingId: session.id,
          transportId,
          event: 'MATCHING_STOPPED',
          timestamp: session.updatedAt.toISOString()
        });
      }
    }

    // Sort by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json<MatchingLogsResponse>({
      transportId,
      logs: logs.slice(0, 100),
      total: logs.length
    }, { status: 200 });

  } catch (error) {
    console.error('Get matching logs error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to get matching logs',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
