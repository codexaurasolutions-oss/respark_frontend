const { execSync } = require('child_process');

try {
  const status = execSync('git status --porcelain').toString();
  const lines = status.split('\n');
  for (const line of lines) {
    if (line.startsWith(' D ')) {
      const file = line.substring(3).trim();
      console.log('Restoring:', file);
      execSync(`git checkout -- "${file}"`);
    }
  }
  console.log('Restore completed.');
} catch (e) {
  console.error(e);
}
