import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MatchingResultsResponse, RankedCandidate, ApiErrorResponse } from '@/types/matching';

// GET /api/matching/results/[transportId] - Get matching results for a transport
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transportId: string }> }
) {
  try {
    const { transportId } = await params;

    // Get matching session
    const session = await db.matchingSession.findFirst({
      where: { transportId },
      orderBy: { createdAt: 'desc' },
      include: {
        candidates: {
          orderBy: { score: 'desc' },
          take: 50,
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            vehicle: true
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'No matching session found for this transport',
        code: 'NO_MATCHING_SESSION'
      }, { status: 404 });
    }

    // Build ranked candidates
    const candidates: RankedCandidate[] = session.candidates.map((candidate, index) => ({
      driverId: candidate.driverId,
      vehicleId: candidate.vehicleId,
      score: candidate.score,
      rank: index + 1,
      scoreBreakdown: candidate.scoreBreakdown ? JSON.parse(candidate.scoreBreakdown) : {
        distanceScore: 0,
        reputationScore: 0,
        priceScore: 0,
        experienceScore: 0,
        languageScore: 0,
        returnLoadScore: 0,
        historyScore: 0
      },
      matchReasons: candidate.scoreBreakdown ? JSON.parse(candidate.scoreBreakdown).reasons || [] : [],
      estimatedArrival: candidate.expiresAt?.toISOString()
    }));

    // Get best match
    const bestMatch = candidates.length > 0 ? candidates[0] : undefined;

    // Calculate matching duration
    let matchingDuration: number | undefined;
    if (session.completedAt) {
      matchingDuration = session.completedAt.getTime() - session.createdAt.getTime();
    }

    return NextResponse.json<MatchingResultsResponse>({
      transportId,
      matchingId: session.id,
      status: session.status.toLowerCase() as any,
      candidates,
      bestMatch,
      totalCandidates: session.candidates.length,
      matchingDuration,
      startedAt: session.createdAt.toISOString(),
      completedAt: session.completedAt?.toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Get matching results error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to get matching results',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
