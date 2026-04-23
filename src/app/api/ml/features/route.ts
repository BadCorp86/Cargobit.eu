/**
 * CargoBit ML Feature Store API
 * POST /api/ml/features - Snapshot features for completed job
 * GET /api/ml/features - Export training data
 */

import { NextRequest, NextResponse } from 'next/server';
import { mlFeatureStore } from '@/services/ml-featurestore.service';

// ============================================
// POST /api/ml/features
// ============================================

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    
    // Only admin or system can trigger snapshot
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { jobId } = body as { jobId: string };
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }
    
    // Python: snapshot_features_for_job(...)
    const result = await mlFeatureStore.snapshotFeaturesForJob(jobId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      featureId: result.featureId,
      label: result.label,
    });
    
  } catch (error: any) {
    console.error('[API] POST /ml/features error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to snapshot features' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/ml/features
// ============================================

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10000');
    
    // Check if stats requested
    if (searchParams.get('stats') === 'true') {
      const stats = await mlFeatureStore.getFeatureStatistics();
      return NextResponse.json(stats);
    }
    
    // Python: export_training_data(...)
    const exportData = await mlFeatureStore.exportTrainingData(limit);
    
    return NextResponse.json(exportData);
    
  } catch (error: any) {
    console.error('[API] GET /ml/features error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export training data' },
      { status: 500 }
    );
  }
}
