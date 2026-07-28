import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, isAbsolute } from 'node:path';

const FAILURE = 'package-artifact-check: failed\n';

function normalize(value) {
  const path = value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  if (!path || isAbsolute(path) || path.split('/').includes('..') || /[*?[\]]/.test(path)) {
    throw new Error('invalid path');
  }
  return path;
}

function covered(path, roots) {
  return path === 'package.json'
    || /^licen[cs]e(?:\.[a-z0-9]+)?$/i.test(path)
    || roots.some((root) => path === root || path.startsWith(`${root}/`));
}

function readPackedFile(filename, path) {
  return execFileSync('tar', ['-xOzf', filename, `package/${path}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function assertNoBundledThirdPartySources(filename, paths) {
  const manifest = JSON.parse(readPackedFile(filename, 'package.json'));
  if (manifest.dependencies?.['lucide-react']) {
    throw new Error('forbidden runtime dependency');
  }

  for (const path of paths.filter((value) => /^dist\/.*\.js$/.test(value))) {
    const source = readPackedFile(filename, path);
    if (/(?:^|\n)\/\/#region node_modules\//.test(source) || /lucide-react/.test(source)) {
      throw new Error('bundled third-party JavaScript');
    }
  }

  for (const path of paths.filter((value) => /^dist\/.*\.js\.map$/.test(value))) {
    const sourceMap = JSON.parse(readPackedFile(filename, path));
    const sources = Array.isArray(sourceMap.sources) ? sourceMap.sources : [];
    if (
      sources.some((source) =>
        /(^|\/)node_modules\//.test(String(source).replaceAll('\\', '/')),
      )
    ) {
      throw new Error('bundled third-party source map');
    }
  }
}

try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  if (!Array.isArray(packageJson.files) || packageJson.files.length === 0) {
    throw new Error('missing files');
  }
  const roots = packageJson.files.map((entry) => normalize(entry));
  const packed = JSON.parse(execFileSync(
    'npm',
    ['pack', '--json', '--ignore-scripts'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ));
  if (!Array.isArray(packed) || packed.length !== 1) throw new Error('invalid pack');

  const [{ filename, files }] = packed;
  if (typeof filename !== 'string' || basename(filename) !== filename || !/^[a-z0-9._-]+\.tgz$/i.test(filename)) {
    throw new Error('invalid artifact');
  }
  if (!Array.isArray(files) || files.length === 0) throw new Error('missing artifact files');
  const paths = files.map((entry) => normalize(entry?.path ?? ''));
  if (!paths.every((path) => covered(path, roots))) throw new Error('unexpected artifact file');
  if (!roots.every((root) => paths.some((path) => path === root || path.startsWith(`${root}/`)))) {
    throw new Error('missing allow-list root');
  }
  assertNoBundledThirdPartySources(filename, paths);
  process.stdout.write(`${filename}\n`);
} catch {
  process.stderr.write(FAILURE);
  process.exitCode = 1;
}
