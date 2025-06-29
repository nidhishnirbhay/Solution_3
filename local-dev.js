#!/usr/bin/env node

// Compatibility script for Node.js 20.9 (import.meta.dirname not supported)
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check Node.js version
const nodeVersion = process.version;
console.log('Node.js version:', nodeVersion);

if (nodeVersion < 'v20.11.0') {
  console.log('⚠️  Node.js 20.11+ recommended for full compatibility');
  console.log('Current version works but may have path resolution issues');
}

// Ensure we're in the right directory
process.chdir(__dirname);

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.error('❌ Error: .env file not found. Please create one with your environment variables.');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Ensure required directories exist
const publicDir = path.join(process.cwd(), 'public');
const uploadsDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public directory:', publicDir);
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// Verify environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Set environment variables for local development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '5000';

console.log('\n🚀 Starting OyeGaadi in development mode...');
console.log('📋 Environment Configuration:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);
console.log('   Working directory:', process.cwd());
console.log('   Database configured:', !!process.env.DATABASE_URL);
console.log('   Session secret configured:', !!process.env.SESSION_SECRET);
console.log('');

// Use tsx directly with compatibility flags for older Node.js
const tsxArgs = [
  '--loader', 'tsx/esm',
  'server/index.ts'
];

const child = spawn('npx', ['tsx', ...tsxArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--loader=tsx/esm'
  }
});

child.on('exit', (code) => {
  console.log(`\n📊 Application exited with code ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Failed to start application:', error.message);
  console.error('\nTroubleshooting steps:');
  console.error('1. Run: npm install');
  console.error('2. Check Node.js version: node --version');
  console.error('3. Try: npm run dev');
  process.exit(1);
});