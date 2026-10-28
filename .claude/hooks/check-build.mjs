// PostToolUse hook: after Claude edits a source file, run a quick Vite build
// so broken imports / syntax errors show up right away.
// Exit 2 sends the error back to Claude so it can fix it.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let input = '';
for await (const chunk of process.stdin) input += chunk;

const file = (JSON.parse(input || '{}').tool_input?.file_path ?? '').replace(/\\/g, '/');
if (!/(^|\/)(src\/.+\.(js|glsl|css)|index\.html)$/.test(file)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const outDir = join(tmpdir(), 'ocean-particles-hook-build'); // keep the real dist/ untouched

const r = spawnSync(process.execPath, [vite, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
});

if (r.status !== 0) {
  process.stderr.write(`Build failed after editing ${file}:\n${(r.stderr || r.stdout).slice(-4000)}`);
  process.exit(2);
}
