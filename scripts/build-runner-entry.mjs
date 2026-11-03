import fs from 'node:fs/promises';
import { runBuild, checkEnvironment, cancelCurrentBuild } from '../server/build.mjs';

function emit(value) {
  process.stdout.write(JSON.stringify(value) + '\n');
}

const mode = process.argv[2];

if (mode === 'env') {
  emit(await checkEnvironment());
  process.exit(0);
}

if (mode === 'build') {
  const requestPath = process.argv[3];
  if (!requestPath) {
    emit({ type: 'error', message: 'Hiányzó build kérés.' });
    process.exit(1);
  }

  const request = JSON.parse(await fs.readFile(requestPath, 'utf8'));
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      try {
        const message = JSON.parse(line);
        if (message.type === 'cancel') {
          emit({ type: 'log', line: 'Megszakítás kérése…' });
          cancelCurrentBuild();
        }
      } catch {
        // nem JSON vezérlőüzenet
      }
    }
  });
  process.stdin.resume();

  try {
    const artifactPath = await runBuild({
      project: request.project,
      target: request.target,
      workspace: request.workspace,
      onLog: (line) => emit({ type: 'log', line }),
    });
    emit({ type: 'done', artifactPath });
    process.exit(0);
  } catch (err) {
    emit({ type: 'error', message: err?.message || String(err) });
    process.exit(1);
  }
}

emit({ type: 'error', message: `Ismeretlen mód: ${mode}` });
process.exit(1);
