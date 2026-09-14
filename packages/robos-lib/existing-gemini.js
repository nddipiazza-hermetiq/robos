"use strict";
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execFile, spawn } = require('child_process');

function detectGemini({ home = os.homedir(), version = () => execFileSync('gemini', ['--version'], {encoding:'utf8', timeout:15000, stdio:['ignore','pipe','ignore']}) } = {}) {
  let installed = false, cliVersion = '';
  try { cliVersion = version().trim().split('\n').pop(); installed = !!cliVersion; } catch {}
  let authType = '';
  try { const settings = JSON.parse(fs.readFileSync(path.join(home,'.gemini','settings.json'),'utf8')); authType = settings.security?.auth?.selectedType || ''; } catch {}
  return {id:'gemini', name:'Gemini CLI', installed, version:cliVersion, authenticated:false,
    configurationPresent:!!authType, authType, status:installed ? (authType ? 'Existing configuration; connection not yet tested' : 'Installed; authentication not verified') : 'Not installed'};
}
function registerGemini(ipcMain) {
  ipcMain.handle('gemini-launch-terminal', () => {
    const child = spawn('x-terminal-emulator', ['-e','gemini'], {env:process.env, detached:true, stdio:'ignore'});
    child.on('error', () => {}); child.unref();
  });
  ipcMain.handle('gemini-check', () => new Promise(resolve => {
    execFile('gemini', ['-p','Reply with exactly ROBOS_READY. Do not use tools or access files.'],
      {env:process.env, timeout:45000, maxBuffer:1024*1024}, (error, stdout) => {
        const ok = !error && /\bROBOS_READY\b/.test(stdout || '');
        resolve({ok, message:ok ? 'Gemini responded using its existing configuration.' : 'Connection not verified. Open the existing Gemini CLI to inspect its login or gateway; no configuration was changed.'});
      });
  }));
}
module.exports = {detectGemini, registerGemini};
