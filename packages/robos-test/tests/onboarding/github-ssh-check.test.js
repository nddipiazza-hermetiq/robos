const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkGitHubSsh } = require('../../../robos-lib/github-ssh-check');

function response(error, stdout, stderr) {
  return (_file, args, options, callback) => {
    assert.ok(args.includes('BatchMode=yes'));
    assert.equal(options.timeout, 15000);
    callback(error, stdout, stderr);
  };
}

test('GitHub success on stderr with exit 1 counts as authenticated', async () => {
  const result = await checkGitHubSsh(response({ code: 1 }, '', "Hi developer! You've successfully authenticated, but GitHub does not provide shell access."));
  assert.equal(result.ok, true);
});
test('permission failure preserves diagnostic output', async () => {
  assert.deepEqual(await checkGitHubSsh(response({ code: 255 }, null, 'Permission denied (publickey).')),
    { ok: false, output: 'Permission denied (publickey).' });
});
test('missing output and timeouts return a failure instead of throwing', async () => {
  const result = await checkGitHubSsh(response({ killed: true, message: 'SSH timed out' }, null, null));
  assert.deepEqual(result, { ok: false, output: 'SSH timed out' });
  assert.equal((await checkGitHubSsh(response(null, null, null))).ok, false);
});
test('a killed process cannot pass using partial success output', async () => {
  assert.equal((await checkGitHubSsh(response({ code: 1, killed: true }, 'successfully authenticated', ''))).ok, false);
});
