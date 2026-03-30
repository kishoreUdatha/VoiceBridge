/**
 * Lead Lifecycle Test Runner
 *
 * Runs all lead lifecycle tests in sequence
 *
 * Usage:
 *   npx ts-node scripts/run-lead-tests.ts              # Run all tests
 *   npx ts-node scripts/run-lead-tests.ts --cleanup    # Run tests and cleanup
 *   npx ts-node scripts/run-lead-tests.ts lifecycle    # Run specific test
 *   npx ts-node scripts/run-lead-tests.ts followup     # Run follow-up tests
 *   npx ts-node scripts/run-lead-tests.ts autoassign   # Run auto-assign tests
 *   npx ts-node scripts/run-lead-tests.ts api          # Run API tests
 */

import { execSync } from 'child_process';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runTest(scriptName: string, description: string): boolean {
  const scriptPath = path.join(__dirname, scriptName);
  const cleanupFlag = process.argv.includes('--cleanup') ? '--cleanup' : '';

  log(`\n${'═'.repeat(70)}`, colors.cyan);
  log(`  RUNNING: ${description}`, colors.cyan);
  log(`  Script: ${scriptName}`, colors.blue);
  log(`${'═'.repeat(70)}`, colors.cyan);

  try {
    execSync(`npx ts-node ${scriptPath} ${cleanupFlag}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    log(`\n✓ ${description} - PASSED`, colors.green);
    return true;
  } catch (error) {
    log(`\n✗ ${description} - FAILED`, colors.red);
    return false;
  }
}

function printUsage() {
  console.log(`
${colors.cyan}Lead Lifecycle Test Runner${colors.reset}

${colors.yellow}Usage:${colors.reset}
  npx ts-node scripts/run-lead-tests.ts [test] [options]

${colors.yellow}Tests:${colors.reset}
  all        Run all tests (default)
  lifecycle  Run lead lifecycle tests (database)
  api        Run lead lifecycle API tests
  followup   Run follow-up system tests
  autoassign Run auto-assign system tests

${colors.yellow}Options:${colors.reset}
  --cleanup  Delete test data after running
  --help     Show this help message

${colors.yellow}Examples:${colors.reset}
  npx ts-node scripts/run-lead-tests.ts                 # Run all tests
  npx ts-node scripts/run-lead-tests.ts lifecycle       # Run lifecycle tests only
  npx ts-node scripts/run-lead-tests.ts api --cleanup   # Run API tests with cleanup
  npx ts-node scripts/run-lead-tests.ts all --cleanup   # Run all with cleanup
`);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const testToRun = args[0] || 'all';

  if (process.argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  console.log(`
${colors.magenta}╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║              LEAD LIFECYCLE COMPREHENSIVE TEST SUITE                 ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  const tests: Array<{ name: string; script: string; description: string }> = [
    {
      name: 'lifecycle',
      script: 'test-lead-lifecycle.ts',
      description: 'Lead Lifecycle (Database Operations)',
    },
    {
      name: 'followup',
      script: 'test-followup-system.ts',
      description: 'Follow-up System',
    },
    {
      name: 'autoassign',
      script: 'test-auto-assign.ts',
      description: 'Auto-Assignment System',
    },
    {
      name: 'api',
      script: 'test-lead-lifecycle-api.ts',
      description: 'Lead Lifecycle (API Endpoints)',
    },
  ];

  let testsToRun = tests;
  if (testToRun !== 'all') {
    testsToRun = tests.filter((t) => t.name === testToRun);
    if (testsToRun.length === 0) {
      log(`Unknown test: ${testToRun}`, colors.red);
      printUsage();
      process.exit(1);
    }
  }

  log(`Running ${testsToRun.length} test suite(s)...`, colors.blue);
  if (process.argv.includes('--cleanup')) {
    log('Cleanup mode enabled - test data will be deleted', colors.yellow);
  }

  const results: Array<{ name: string; passed: boolean }> = [];

  for (const test of testsToRun) {
    const passed = runTest(test.script, test.description);
    results.push({ name: test.description, passed });

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════╗
║                           TEST RESULTS SUMMARY                       ║
╚══════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? colors.green : colors.red;
    log(`  ${icon} ${result.name}`, color);
  });

  console.log();
  log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, colors.blue);
  console.log();

  if (failed > 0) {
    log('Some tests failed. Please check the output above for details.', colors.red);
    process.exit(1);
  } else {
    log('All tests passed successfully!', colors.green);
  }
}

main().catch((error) => {
  log(`Test runner error: ${error.message}`, colors.red);
  process.exit(1);
});
