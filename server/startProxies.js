#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

const root = process.cwd();

function startScript(scriptPath, name) {
  const abs = path.resolve(root, scriptPath);
  const child = spawn(process.execPath, [abs], { stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    console.log(`[startProxies] ${name} exited with`, { code, signal });
  });
  child.on('error', (err) => {
    console.error(`[startProxies] ${name} failed to start:`, err.message);
  });
  return child;
}

console.log('[startProxies] Starting dev proxies...');
const devProxy = startScript('server/devProxy.js', 'devProxy');
const gemmaProxy = startScript('server/gemmaProxy.js', 'gemmaProxy');

// Graceful shutdown: forward SIGINT/SIGTERM to children
function shutdown(code) {
  console.log('[startProxies] Shutting down children...');
  try { devProxy.kill('SIGINT'); } catch {};
  try { gemmaProxy.kill('SIGINT'); } catch {};
  process.exit(code || 0);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Keep the parent process alive until children exit
devProxy.on('close', (c) => { console.log('[startProxies] devProxy closed', c); });
gemmaProxy.on('close', (c) => { console.log('[startProxies] gemmaProxy closed', c); });
