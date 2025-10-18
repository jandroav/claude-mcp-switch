#!/usr/bin/env node
/**
 * Cross-platform test runner for Node.js --test
 * Expands glob patterns and passes individual files to node --test
 */

const { spawn } = require('child_process');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');
const { platform } = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
const testDirs = args.filter(arg => !arg.startsWith('--'));
const flags = args.filter(arg => arg.startsWith('--'));

/**
 * Recursively find all .test.js files in a directory
 */
function findTestFiles(dir) {
  const results = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          results.push(...findTestFiles(fullPath));
        } else if (entry.endsWith('.test.js')) {
          results.push(fullPath);
        }
      } catch (err) {
        // Skip files we can't stat
        continue;
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }

  return results;
}

// Find all test files
let testFiles = [];
for (const dir of testDirs) {
  testFiles.push(...findTestFiles(dir));
}

if (testFiles.length === 0) {
  console.error('No test files found in:', testDirs.join(', '));
  process.exit(1);
}

// Run node --test with all found files
const nodeArgs = ['--test', ...flags, ...testFiles];

const child = spawn('node', nodeArgs, {
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start test process:', err);
  process.exit(1);
});
