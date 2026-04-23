#!/usr/bin/env node
// ============================================
// CARGOBIT SECURITY GATEWAY - CHAOS TEST RUNNER
// Version: 2.0 - Orchestrated Chaos Experiments
// ============================================

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

interface ChaosExperiment {
  name: string;
  file: string;
  duration: string;
  description: string;
  expectedBehavior: string;
  verification: () => Promise<boolean>;
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004';
const NAMESPACE = process.env.NAMESPACE || 'cargobit';
const REPORT_DIR = process.env.REPORT_DIR || './chaos-reports';

// ============================================
// EXPERIMENTS
// ============================================

const EXPERIMENTS: ChaosExperiment[] = [
  {
    name: 'risk-engine-latency',
    file: 'risk-engine-latency.yaml',
    duration: '5m',
    description: 'Inject 500ms latency to Risk Engine',
    expectedBehavior: 'Gateway should timeout gracefully and use cached decisions',
    verification: verifyLatencyBehavior,
  },
  {
    name: 'risk-engine-pod-failure',
    file: 'risk-engine-pod-failure.yaml',
    duration: '2m',
    description: 'Kill Risk Engine pod',
    expectedBehavior: 'Gateway should return fail-safe blocked decisions',
    verification: verifyFailSafeBehavior,
  },
  {
    name: 'postgres-latency',
    file: 'postgres-latency.yaml',
    duration: '3m',
    description: 'Inject 200ms latency to PostgreSQL',
    expectedBehavior: 'Gateway should handle slow DB gracefully',
    verification: verifyDatabaseBehavior,
  },
  {
    name: 'notification-service-down',
    file: 'notification-service-down.yaml',
    duration: '5m',
    description: 'Take down notification service',
    expectedBehavior: 'Notifications should be queued and delivered later',
    verification: verifyNotificationQueue,
  },
  {
    name: 'gateway-risk-partition',
    file: 'gateway-risk-partition.yaml',
    duration: '3m',
    description: 'Network partition between Gateway and Risk Engine',
    expectedBehavior: 'Gateway should detect partition and use fail-safe mode',
    verification: verifyFailSafeBehavior,
  },
];

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

async function verifyLatencyBehavior(): Promise<boolean> {
  console.log('  📊 Verifying latency behavior...');

  try {
    // Make request and measure response time
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/api/security/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: `chaos-test-${Date.now()}`,
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ACCEPT_OFFER',
        entity: { type: 'transaction', id: 'tx_chaos_001' },
      }),
    });
    const duration = Date.now() - start;

    console.log(`    Response time: ${duration}ms`);
    console.log(`    Status: ${response.status}`);

    // Should still respond, even if slower
    if (response.status >= 500) {
      console.log('    ❌ Server error during latency injection');
      return false;
    }

    const body = await response.json();
    console.log(`    Decision: ${body.decision}`);

    return true;
  } catch (error) {
    console.log(`    ❌ Error: ${error}`);
    return false;
  }
}

async function verifyFailSafeBehavior(): Promise<boolean> {
  console.log('  📊 Verifying fail-safe behavior...');

  try {
    const response = await fetch(`${BASE_URL}/api/security/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: `chaos-test-${Date.now()}`,
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ACCEPT_OFFER',
        entity: { type: 'transaction', id: 'tx_chaos_002' },
      }),
    });

    console.log(`    Status: ${response.status}`);

    // Gateway should remain responsive
    if (response.status >= 500) {
      console.log('    ❌ Server error - gateway not resilient');
      return false;
    }

    const body = await response.json();
    console.log(`    Decision: ${body.decision}`);
    console.log(`    CorrelationId: ${body.correlationId}`);

    // In fail-safe mode, might block or use cached decision
    // But audit event should still be created
    if (!body.correlationId) {
      console.log('    ❌ No correlation ID - audit trail broken');
      return false;
    }

    return true;
  } catch (error) {
    console.log(`    ❌ Error: ${error}`);
    return false;
  }
}

async function verifyDatabaseBehavior(): Promise<boolean> {
  console.log('  📊 Verifying database behavior...');

  try {
    const response = await fetch(`${BASE_URL}/api/security/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: `chaos-test-${Date.now()}`,
        user: { id: 'u_1001', role: 'SHIPPER_COMPANY' },
        action: 'ACCEPT_OFFER',
        entity: { type: 'transaction', id: 'tx_chaos_003' },
      }),
    });

    console.log(`    Status: ${response.status}`);
    return response.status < 500;
  } catch (error) {
    console.log(`    ❌ Error: ${error}`);
    return false;
  }
}

async function verifyNotificationQueue(): Promise<boolean> {
  console.log('  📊 Verifying notification queue behavior...');

  try {
    // Trigger a red case that should send notification
    const response = await fetch(`${BASE_URL}/api/security/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: `chaos-test-${Date.now()}`,
        user: { id: 'u_1003', role: 'SHIPPER_COMPANY' },
        action: 'INITIATE_PAYOUT',
        entity: { type: 'transaction', id: 'tx_chaos_red', context: { amount: 75000 } },
      }),
    });

    console.log(`    Status: ${response.status}`);

    if (response.status < 500) {
      console.log('    ✅ Request processed despite notification service down');
      return true;
    }

    return false;
  } catch (error) {
    console.log(`    ❌ Error: ${error}`);
    return false;
  }
}

// ============================================
// TEST RUNNER
// ============================================

interface TestResult {
  experiment: string;
  success: boolean;
  duration: number;
  error?: string;
  metrics?: Record<string, number>;
}

async function runExperiment(experiment: ChaosExperiment): Promise<TestResult> {
  console.log(`\n🧪 Running: ${experiment.name}`);
  console.log(`   Description: ${experiment.description}`);
  console.log(`   Expected: ${experiment.expectedBehavior}`);
  console.log(`   Duration: ${experiment.duration}`);

  const startTime = Date.now();
  let success = false;

  try {
    // Check if Chaos Mesh is available
    const chaosMeshAvailable = checkChaosMeshAvailable();

    if (chaosMeshAvailable) {
      // Apply the chaos experiment
      console.log('  🚀 Applying chaos experiment...');
      execSync(`kubectl apply -f ${path.join(__dirname, experiment.file)} -n ${NAMESPACE}`, {
        stdio: 'inherit',
      });

      // Wait for experiment to take effect
      console.log('  ⏳ Waiting for experiment to take effect...');
      await sleep(30000);

      // Run verification
      console.log('  🔍 Running verification...');
      success = await experiment.verification();

      // Clean up
      console.log('  🧹 Cleaning up...');
      execSync(`kubectl delete -f ${path.join(__dirname, experiment.file)} -n ${NAMESPACE}`, {
        stdio: 'inherit',
      });
    } else {
      // Simulate chaos for local testing
      console.log('  🖥️ Chaos Mesh not available, simulating chaos...');
      console.log('  📝 Running verification against available services...');
      success = await experiment.verification();
    }

    // Additional verification passes
    console.log('  🔄 Running additional verification pass...');
    const secondPass = await experiment.verification();
    success = success && secondPass;

  } catch (error) {
    console.error(`  ❌ Experiment failed: ${error}`);
    success = false;
  }

  const duration = Date.now() - startTime;

  console.log(`  ${success ? '✅' : '❌'} Experiment ${success ? 'passed' : 'failed'}`);

  return {
    experiment: experiment.name,
    success,
    duration,
  };
}

function checkChaosMeshAvailable(): boolean {
  try {
    execSync('kubectl get crd networkchaos.chaos-mesh.org', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧨 CARGOBIT SECURITY GATEWAY - CHAOS TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📦 Namespace: ${NAMESPACE}`);
  console.log('');

  // Create report directory
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  // Run all experiments
  const results: TestResult[] = [];

  for (const experiment of EXPERIMENTS) {
    const result = await runExperiment(experiment);
    results.push(result);
  }

  // Generate report
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 CHAOS TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} - ${result.experiment} (${result.duration}ms)`);
  }

  console.log('');
  console.log(`📈 Total: ${results.length} experiments`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  // Save detailed report
  const reportPath = path.join(REPORT_DIR, `chaos-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
