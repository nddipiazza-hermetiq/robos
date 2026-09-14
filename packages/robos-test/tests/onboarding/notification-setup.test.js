const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { createSetup } = require('../../../robos-lib/notification-setup');
function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'robos-notifications-'));
  const setup = createSetup({ home, electron: process.execPath });
  return { home, setup };
}
test('repeated installation preserves history and preferences and produces runnable launchers', () => {
  const { home, setup } = fixture();
  const dir = path.join(home, '.config/robos'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'notifications.json'), '[{"id":"existing"}]');
  fs.writeFileSync(path.join(dir, 'notification-prefs.json'), '{"dnd":true}');
  setup.install(); setup.install();
  assert.equal(setup.status().installed, true); assert.equal(setup.status().autostart, true);
  assert.equal(setup.status().dnd, true);
  assert.equal(fs.readFileSync(path.join(dir, 'notifications.json'), 'utf8'), '[{"id":"existing"}]');
  assert.equal(fs.readFileSync(path.join(dir, 'notification-prefs.json'), 'utf8'), '{"dnd":true}');
  assert.ok(fs.statSync(path.join(home, '.local/bin/robos-toast')).mode & 0o100);
});
test('custom startup is preserved and install fails before creating launchers', () => {
  const { home, setup } = fixture();
  const file = path.join(home, '.config/autostart/robos-toast.desktop');
  fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, 'custom');
  assert.throws(() => setup.install(), /Existing custom launcher preserved/);
  assert.equal(fs.readFileSync(file, 'utf8'), 'custom');
  assert.equal(fs.existsSync(path.join(home, '.local/bin/robos-toast')), false);
});
test('test message is refused when daemon is not running', () => {
  const { setup } = fixture(); assert.throws(() => setup.testNotification(), /start notification popups first/);
});
