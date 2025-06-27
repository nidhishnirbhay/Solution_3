#!/usr/bin/env node

// Local development script to properly set up environment
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure we're in the right directory
process.chdir(__dirname);

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.error('Error: .env file not found. Please create one with your environment variables.');
  process.exit(1);
}

// Load environment variables
require('dotenv').config();

// Ensure required directories exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Set environment variables for local development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '5000';

console.log('Starting OyeGaadi in development mode...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Working directory:', process.cwd());

// Start the application
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});