const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const ROOT = path.resolve(__dirname, '../..');
const MARKER = '# Managed by RobOS notification setup';
const sh = value => "'" + value.replace(/'/g, "'\\''") + "'";

function createSetup({ home = os.homedir(), root = ROOT, electron } = {}) {
  const config = path.join(home, '.config/robos');
  const bin = path.join(home, '.local/bin');
  const autostart = path.join(home, '.config/autostart/robos-toast.desktop');
  const ready = path.join(config, 'toast-ready.json');
  function runtime() {
    const candidates = [electron, process.versions.electron && process.execPath,
      ...['robos-toast', 'robos-graph', 'robos-onboarding'].map(p => path.join(root, 'packages', p, 'node_modules/electron/dist/electron'))].filter(Boolean);
    const found = candidates.find(p => fs.existsSync(p));
    if (!found) throw Error('Electron is missing. Run npm install --prefix packages/robos-toast in your RobOS checkout, then retry.');
    return found;
  }
  function status() {
    let running = false;
    try {
      const { pid } = JSON.parse(fs.readFileSync(ready, 'utf8'));
      const argv = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0');
      running = argv.some(a => a.endsWith('/robos-toast/main.js'));
    } catch {}
    let prefs = {};
    try { prefs = JSON.parse(fs.readFileSync(path.join(config, 'notification-prefs.json'), 'utf8')); } catch {}
    return { installed: ['robos-toast', 'robos-notifications'].every(n => fs.existsSync(path.join(bin, n))),
      autostart: fs.existsSync(autostart) && !/^(Hidden=true|X-GNOME-Autostart-enabled=false)$/m.test(fs.readFileSync(autostart, 'utf8')),
      running, dnd: !!prefs.dnd, quietHours: !!prefs.quietHours?.enabled };
  }
  function install() {
    const executable = runtime();
    const files = new Map();
    for (const [name, pkg, args] of [['robos-toast','robos-toast',' --background'], ['robos-notifications','notifications','']]) {
      const main = path.join(root, 'packages', pkg, 'main.js');
      if (!fs.existsSync(main)) throw Error(`Missing RobOS app: ${main}`);
      files.set(path.join(bin, name), `#!/bin/sh\n${MARKER}\nunset ELECTRON_RUN_AS_NODE\nexec ${sh(executable)} ${sh(main)} --no-sandbox${args} "$@"\n`);
    }
    const desktop = (name, command, extra = '') => `${MARKER}\n[Desktop Entry]\nType=Application\nName=${name}\nExec="${path.join(bin, command).replace(/([\\"`$])/g, '\\$1')}"\nTerminal=false\n${extra}`;
    files.set(autostart, desktop('RobOS Notification Popups', 'robos-toast', 'X-GNOME-Autostart-enabled=true\n'));
    files.set(path.join(home, '.local/share/applications/robos-notifications.desktop'), desktop('RobOS Notifications', 'robos-notifications'));
    // Preflight every target before writing any file. Keep custom launchers untouched.
    for (const [file] of files) if (fs.existsSync(file) && !fs.readFileSync(file, 'utf8').includes(MARKER)) {
      throw Error(`Existing custom launcher preserved: ${file}. Review its configuration before replacing it.`);
    }
    for (const [file, contents] of files) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== contents) fs.writeFileSync(file, contents);
      if (file.startsWith(bin + path.sep)) fs.chmodSync(file, 0o755);
    }
    return status();
  }
  async function launch(command) {
    if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) throw Error('Run this from your logged-in desktop session.');
    fs.mkdirSync(config, { recursive: true });
    const log = fs.openSync(path.join(config, 'notification-service.log'), 'a', 0o600);
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(path.join(bin, command), [], { detached: true, stdio: ['ignore', log, log] });
        child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(); });
      });
    } finally { fs.closeSync(log); }
  }
  async function start() {
    if (status().running) return status();
    await launch('robos-toast');
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (status().running) return status();
    }
    throw Error('Popup daemon did not become ready. See ~/.config/robos/notification-service.log. An older running daemon may need restarting.');
  }
  function testNotification() {
    if (!status().running) throw Error('Install and start notification popups first.');
    const file = path.join(config, 'notifications.json');
    // Refuse to discard an existing unreadable history.
    const history = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    if (!Array.isArray(history)) throw Error('Notification history is not an array; existing history preserved.');
    const entry = { id: randomUUID(), title: 'RobOS notifications are connected', body: 'Setup test: this popup is also saved in RobOS Notifications.', source: 'robos-onboarding', category: 'system', tier: 'info', ts: new Date().toISOString(), read: false };
    history.unshift(entry);
    fs.writeFileSync(file, JSON.stringify(history, null, 2));
    return { id: entry.id, message: status().dnd ? 'Test saved in Notifications. Do Not Disturb is enabled; popup suppressed.' : 'Test saved in Notifications. Look for the RobOS popup, then open Notifications to verify the same message.' };
  }
  return { status, install, start, testNotification, open: () => launch('robos-notifications') };
}
module.exports = { createSetup };
if (require.main === module) {
  const setup = createSetup();
  const action = process.argv[2] || 'status';
  Promise.resolve().then(async () => {
    if (action === 'install') { setup.install(); return setup.start(); }
    if (action === 'test') return setup.testNotification();
    if (action === 'open') return setup.open();
    if (action === 'status') return setup.status();
    throw Error('Usage: node packages/robos-lib/notification-setup.js status|install|test|open');
  }).then(result => console.log(JSON.stringify(result || {ok:true}, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
