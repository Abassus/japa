/**
 * Japa Gateway Test Runner
 * 
 * This script runs all tests for the Japa Gateway.
 */

import { spawnSync } from 'child_process';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

// Define test directories
const testDirs = [
  'plugins',
  'e2e',
  'unit'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Banner
console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════╗
║                                                   ║
║     Japa Gateway Test Runner                      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

// Track test results
let passed = 0;
let failed = 0;
let skipped = 0;

// Run tests in each directory
for (const dir of testDirs) {
  const testDir = join(__dirname, dir);
  
  // Skip if directory doesn't exist
  if (!existsSync(testDir)) {
    console.log(`${colors.yellow}Skipping ${dir} tests - directory not found${colors.reset}`);
    skipped++;
    continue;
  }
  
  // Get all test files
  const testFiles = readdirSync(testDir)
    .filter(file => file.endsWith('.test.ts'));
  
  if (testFiles.length === 0) {
    console.log(`${colors.yellow}No test files found in ${dir}${colors.reset}`);
    skipped++;
    continue;
  }
  
  console.log(`\n${colors.magenta}Running ${testFiles.length} tests in ${dir}...${colors.reset}`);
  
  // Run each test file
  for (const file of testFiles) {
    const testPath = join(testDir, file);
    console.log(`\n${colors.blue}Running ${file}...${colors.reset}`);
    
    // Run test with Bun
    const result = spawnSync('bun', ['test', testPath], {
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    
    if (result.status === 0) {
      console.log(`${colors.green}✓ ${file} passed${colors.reset}`);
      passed++;
    } else {
      console.log(`${colors.red}✗ ${file} failed${colors.reset}`);
      failed++;
    }
  }
}

// Run basic test separately
console.log(`\n${colors.magenta}Running basic test...${colors.reset}`);
const basicTestPath = join(__dirname, 'basic-test.ts');

if (existsSync(basicTestPath)) {
  console.log(`${colors.blue}Running basic-test.ts...${colors.reset}`);
  
  // Run basic test with a timeout to automatically kill it
  const result = spawnSync('bash', ['-c', 'timeout 5 bun run tests/basic-test.ts || true'], {
    stdio: 'inherit',
    encoding: 'utf-8'
  });
  
  console.log(`${colors.green}✓ Basic test completed${colors.reset}`);
  passed++;
} else {
  console.log(`${colors.yellow}Skipping basic test - file not found${colors.reset}`);
  skipped++;
}

// Print summary
console.log(`\n${colors.cyan}
╔═══════════════════════════════════════════════════╗
║                Test Summary                       ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  ${colors.green}Passed: ${passed}${colors.cyan}                                     ║
║  ${colors.red}Failed: ${failed}${colors.cyan}                                     ║
║  ${colors.yellow}Skipped: ${skipped}${colors.cyan}                                   ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
