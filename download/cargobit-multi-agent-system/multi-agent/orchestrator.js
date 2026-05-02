/**
 * CargoBit Multi-Agent Orchestrator
 * Version: 1.0.0
 * 
 * This orchestrator manages the execution of all agents in the
 * CargoBit code generation pipeline, handling dependencies,
 * validation, and artifact assembly.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Agent imports
const architectAgent = require('./agents/architect-agent');
const backendAgent = require('./agents/backend-agent');
const sreAgent = require('./agents/sre-agent');
const qaAgent = require('./agents/qa-agent');
const complianceAgent = require('./agents/compliance-agent');

class Orchestrator {
  constructor(config) {
    this.config = config;
    this.output = {};
    this.executionLog = [];
    this.errors = [];
  }

  /**
   * Log execution step
   */
  log(agentName, message, status = 'info') {
    const entry = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      message,
      status
    };
    this.executionLog.push(entry);
    console.log(`[${entry.timestamp}] [${agentName}] ${message}`);
  }

  /**
   * Validate agent output
   */
  validateOutput(agentName, expectedFiles, actualFiles) {
    const missingFiles = expectedFiles.filter(f => !actualFiles.includes(f));
    if (missingFiles.length > 0) {
      this.errors.push({
        agent: agentName,
        type: 'missing_files',
        files: missingFiles
      });
      return false;
    }
    return true;
  }

  /**
   * Write files to output directory
   */
  writeFiles(files) {
    const outputDir = this.config.output_directory;
    
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(outputDir, filePath);
      const dir = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, content);
      console.log(`  ✓ Written: ${filePath}`);
    }
  }

  /**
   * Generate manifest.json
   */
  generateManifest() {
    const manifest = {
      generated_at: new Date().toISOString(),
      system: this.config.system,
      version: this.config.version,
      files: Object.keys(this.output),
      agents_executed: this.executionLog
        .filter(e => e.status === 'completed')
        .map(e => e.agent),
      errors: this.errors.length > 0 ? this.errors : null
    };
    
    this.output['manifest.json'] = JSON.stringify(manifest, null, 2);
    return manifest;
  }

  /**
   * Execute a single agent
   */
  async executeAgent(agent, agentName, input) {
    this.log(agentName, `Starting execution...`, 'started');
    
    try {
      const startTime = Date.now();
      const result = await agent.run(input);
      const duration = Date.now() - startTime;
      
      if (result.files) {
        Object.assign(this.output, result.files);
        this.writeFiles(result.files);
      }
      
      // Validate expected outputs
      const expectedOutputs = this.config.agents[agentName]?.outputs || [];
      const actualOutputs = Object.keys(result.files || {});
      
      const valid = this.validateOutput(agentName, expectedOutputs, actualOutputs);
      
      this.log(agentName, `Completed in ${duration}ms (${actualOutputs.length} files)`, 
        valid ? 'completed' : 'completed_with_warnings');
      
      return result;
    } catch (error) {
      this.log(agentName, `Error: ${error.message}`, 'error');
      this.errors.push({
        agent: agentName,
        type: 'execution_error',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Main orchestration logic
   */
  async orchestrate() {
    console.log('\n========================================');
    console.log('CargoBit Multi-Agent System v1.0.0');
    console.log('========================================\n');
    
    try {
      // Step 1: Architect Agent
      console.log('📋 Phase 1: Architecture & Schema');
      const architectResult = await this.executeAgent(
        architectAgent, 
        'architect-agent', 
        {}
      );
      
      // Step 2: Backend Agent
      console.log('\n📋 Phase 2: Backend Services');
      const backendResult = await this.executeAgent(
        backendAgent,
        'backend-agent',
        { 
          schema: architectResult.files['prisma/schema.prisma'] 
        }
      );
      
      // Step 3: SRE Agent
      console.log('\n📋 Phase 3: SRE & Operations');
      const sreResult = await this.executeAgent(
        sreAgent,
        'sre-agent',
        { 
          migrations: architectResult.files['migrations/0001_init.sql'] 
        }
      );
      
      // Step 4: QA Agent
      console.log('\n📋 Phase 4: Quality Assurance');
      const qaResult = await this.executeAgent(
        qaAgent,
        'qa-agent',
        { 
          services: backendResult.files,
          ops: sreResult.files
        }
      );
      
      // Step 5: Compliance Agent
      console.log('\n📋 Phase 5: Compliance & Documentation');
      const complianceResult = await this.executeAgent(
        complianceAgent,
        'compliance-agent',
        {
          architecture: architectResult.files['docs/architecture-overview.md'],
          audit: backendResult.files['src/services/auditLog.ts']
        }
      );
      
      // Generate manifest
      console.log('\n📦 Generating manifest...');
      const manifest = this.generateManifest();
      this.writeFiles({ 'manifest.json': this.output['manifest.json'] });
      
      // Summary
      console.log('\n========================================');
      console.log('✅ GENERATION COMPLETE');
      console.log('========================================');
      console.log(`Total files generated: ${Object.keys(this.output).length}`);
      console.log(`Agents executed: ${manifest.agents_executed.length}`);
      
      if (this.errors.length > 0) {
        console.log(`\n⚠️  Warnings: ${this.errors.length}`);
        this.errors.forEach(e => console.log(`   - ${e.agent}: ${e.type}`));
      }
      
      return {
        success: true,
        output: this.output,
        manifest,
        errors: this.errors
      };
      
    } catch (error) {
      console.error('\n❌ Orchestration failed:', error.message);
      return {
        success: false,
        error: error.message,
        errors: this.errors
      };
    }
  }
}

// Export
module.exports = { Orchestrator, orchestrate: () => new Orchestrator(config).orchestrate() };

// CLI execution
if (require.main === module) {
  const orchestrator = new Orchestrator(config);
  orchestrator.orchestrate()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
