import { readFile } from 'node:fs/promises';

const [lockPath, allowedHost] = process.argv.slice(2);
if (!lockPath || !allowedHost) {
  console.error('Usage: node validate-lock.mjs <package-lock.json> <allowed-host>');
  process.exit(2);
}

const lock = JSON.parse(await readFile(lockPath, 'utf8'));
for (const packageInfo of Object.values(lock.packages ?? {})) {
  if (!packageInfo.resolved) continue;

  const resolved = new URL(packageInfo.resolved);
  if (resolved.protocol !== 'https:' || resolved.hostname !== allowedHost || resolved.port) {
    console.error(`Refusing unexpected dependency URL: ${packageInfo.resolved}`);
    process.exitCode = 1;
  }
}
