const { execFile } = require('child_process');

// GitHub deliberately exits 1 after authenticating: it does not offer a shell.
function checkGitHubSsh(run = execFile) {
  return new Promise((resolve) => {
    run('ssh', ['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
      '-o', 'StrictHostKeyChecking=accept-new', 'git@github.com'],
    { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 },
    (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join('\n').trim();
      const expectedExit = !error || (error.code === 1 && !error.killed && !error.signal);
      const ok = expectedExit && /successfully authenticated/i.test(output);
      resolve({ ok, output: output || error?.message || 'SSH returned no authentication response.' });
    });
  });
}

module.exports = { checkGitHubSsh };
