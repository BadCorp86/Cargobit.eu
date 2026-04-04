import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Types for moderation result
interface ModerationAnalysis {
  isViolating: boolean;
  violationTypes: string[];
  confidence: number;
  description: string;
}

// Analyze image/video content using VLM
async function analyzeContent(base64Data: string, contentType: 'image' | 'video'): Promise<ModerationAnalysis> {
  try {
    const zai = await ZAI.create();

    const prompt = `Analysiere dieses ${contentType === 'image' ? 'Bild' : 'Video'} auf folgende Verstöße:
1. Gewalt (Violence) - Gewalttätige Inhalte, Blut, Waffen
2. Pornografie (Pornography) - Nacktheit, sexuelle Inhalte
3. Hasssymbole (Hate Symbols) - Nazi-Symbole, Hass-Symbole, extremistische Kennzeichen
4. Illegale Inhalte (Illegal Content) - Drogen, illegale Aktivitäten

Antworte im folgenden JSON-Format:
{
  "isViolating": boolean,
  "violationTypes": string[],
  "confidence": number (0-1),
  "description": "Kurze Beschreibung auf Deutsch"
}

WICHTIG: Wenn KEIN Verstoß vorliegt, antworte mit:
{
  "isViolating": false,
  "violationTypes": [],
  "confidence": 0.95,
  "description": "Keine Verstöße erkannt"
}`;

    if (contentType === 'image') {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Content-Moderation-System. Du analysierst Bilder auf anstößige oder illegale Inhalte. Antworte NUR mit validem JSON.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ModerationAnalysis;
        }
      } catch {
        // Fallback parsing
      }
    }

    // Default: no violation detected
    return {
      isViolating: false,
      violationTypes: [],
      confidence: 0.5,
      description: 'Analyse nicht möglich'
    };
  } catch (error) {
    console.error('Moderation analysis error:', error);
    return {
      isViolating: false,
      violationTypes: [],
      confidence: 0,
      description: 'Fehler bei der Analyse'
    };
  }
}

// Block user automatically
async function blockUser(userId: string, reason: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      isBlocked: true,
      blockReason: reason,
      blockedAt: new Date(),
      status: 'BLOCKED'
    }
  });
}

// POST - Analyze and moderate content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, contentType, contentBase64, contentUrl, entityType, entityId } = body;

    if (!userId || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, contentType' },
        { status: 400 }
      );
    }

    // Validate content type
    if (!['image', 'video', 'text'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid contentType. Must be: image, video, or text' },
        { status: 400 }
      );
    }

    // For images/videos, analyze content
    let analysis: ModerationAnalysis = {
      isViolating: false,
      violationTypes: [],
      confidence: 0.5,
      description: 'Text content - no analysis performed'
    };

    if ((contentType === 'image' || contentType === 'video') && contentBase64) {
      analysis = await analyzeContent(contentBase64, contentType);
    }

    // Determine action
    let action = 'none';
    if (analysis.isViolating && analysis.confidence >= 0.7) {
      action = 'auto_blocked';
    } else if (analysis.isViolating) {
      action = 'flagged';
    }

    // Save moderation result
    const moderationResult = await db.moderationResult.create({
      data: {
        userId,
        contentType,
        contentUrl: contentUrl || null,
        contentBase64: contentBase64 ? contentBase64.substring(0, 1000) : null, // Store truncated
        entityType: entityType || 'unknown',
        entityId: entityId || null,
        isViolating: analysis.isViolating,
        violationTypes: JSON.stringify(analysis.violationTypes),
        confidence: analysis.confidence,
        aiDescription: analysis.description,
        action,
        blockedAt: action === 'auto_blocked' ? new Date() : null
      }
    });

    // Auto-block user if violation detected with high confidence
    if (action === 'auto_blocked') {
      const violationReason = `Automatische Sperrung wegen: ${analysis.violationTypes.join(', ')}. ${analysis.description}`;
      await blockUser(userId, violationReason);
    }

    return NextResponse.json({
      success: true,
      moderationId: moderationResult.id,
      isViolating: analysis.isViolating,
      violationTypes: analysis.violationTypes,
      confidence: analysis.confidence,
      action,
      description: analysis.description
    });
  } catch (error) {
    console.error('Moderation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve moderation results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const moderationId = searchParams.get('id');
    const status = searchParams.get('status'); // 'violating', 'clean', 'pending'

    if (moderationId) {
      const result = await db.moderationResult.findUnique({
        where: { id: moderationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isBlocked: true,
              blockReason: true
            }
          }
        }
      });

      if (!result) {
        return NextResponse.json({ error: 'Moderation result not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, result });
    }

    // Build query
    const where: Record<string, unknown> = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status === 'violating') {
      where.isViolating = true;
    } else if (status === 'clean') {
      where.isViolating = false;
    } else if (status === 'pending') {
      where.reviewDecision = null;
      where.isViolating = true;
    }

    const results = await db.moderationResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
            isBlocked: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Moderation GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Manual review of moderation result
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { moderationId, reviewDecision, reviewNotes, adminUserId } = body;

    if (!moderationId || !reviewDecision || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: moderationId, reviewDecision, adminUserId' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(reviewDecision)) {
      return NextResponse.json(
        { error: 'Invalid reviewDecision. Must be: approved or rejected' },
        { status: 400 }
      );
    }

    // Update moderation result
    const result = await db.moderationResult.update({
      where: { id: moderationId },
      data: {
        reviewDecision,
        reviewNotes,
        reviewedBy: adminUserId,
        reviewedAt: new Date()
      }
    });

    // If approved (content was wrongly flagged), unblock user
    if (reviewDecision === 'approved' && result.action === 'auto_blocked') {
      await db.user.update({
        where: { id: result.userId },
        data: {
          isBlocked: false,
          blockReason: null,
          blockedAt: null,
          status: 'ACTIVE'
        }
      });
    }

    // If rejected (content is indeed violating), ensure user stays blocked
    if (reviewDecision === 'rejected' && result.isViolating) {
      const violationTypes = result.violationTypes ? JSON.parse(result.violationTypes) : [];
      await db.user.update({
        where: { id: result.userId },
        data: {
          isBlocked: true,
          blockReason: `Manuell bestätigt: ${violationTypes.join(', ')}. ${reviewNotes || ''}`,
          blockedAt: result.blockedAt || new Date(),
          status: 'BLOCKED'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Review saved successfully',
      result
    });
  } catch (error) {
    console.error('Moderation PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
