"use strict";
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execFile, spawn } = require('child_process');

function detectAntigravity({ home = os.homedir(), version = () => execFileSync('agy', ['--version'], {encoding:'utf8', timeout:15000, stdio:['ignore','pipe','ignore']}) } = {}) {
  let installed = false, cliVersion = '';
  try { cliVersion = version().trim().split('\n').pop(); installed = !!cliVersion; } catch {}
  let provider = 'Existing account / keyring';
  try { const settings = JSON.parse(fs.readFileSync(path.join(home,'.gemini','antigravity-cli','settings.json'),'utf8')); if(settings.modelProvider === 'gemini') provider = 'Existing Gemini API provider'; } catch {}
  return {id:'antigravity', name:'Antigravity CLI', installed, version:cliVersion, authenticated:false,
    authType:provider, status:installed ? 'Existing installation; connection not yet tested' : 'Not installed'};
}
function registerAntigravity(ipcMain) {
  ipcMain.handle('antigravity-cli-launch-terminal', () => {
    const child = spawn('x-terminal-emulator', ['-e','agy'], {env:process.env, detached:true, stdio:'ignore'});
    child.on('error', () => {}); child.unref();
  });
  ipcMain.handle('antigravity-cli-check', () => new Promise(resolve => {
    execFile('agy', ['models'], {env:process.env, timeout:45000, maxBuffer:1024*1024}, (error, stdout) => {
      const ok = !error && (stdout || '').split('\n').some(line => /^\S+\t\S/.test(line));
      resolve({ok, message:ok ? 'Connected: Antigravity fetched available models using your existing configuration.' : 'Connection not verified. Open Antigravity CLI to inspect its existing login; no settings were changed.'});
    });
  }));
}
module.exports = {detectAntigravity, registerAntigravity};
