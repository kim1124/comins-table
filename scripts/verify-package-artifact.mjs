import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const FAILURE = 'package-artifact-check: failed\n';
const licenseChecker = fileURLToPath(new URL('./check-licenses.mjs', import.meta.url));
const radixIcons = '@radix-ui/react-icons';
const radixVersion = '1.3.2';
const publicDeclarations = [
  'dist/clipboard.d.ts',
  'dist/core.d.ts',
  'dist/index.d.ts',
  'dist/selection.d.ts',
];

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
  const dependencySections = [
    manifest.dependencies,
    manifest.optionalDependencies,
    manifest.peerDependencies,
    manifest.devDependencies,
  ];
  if (
    dependencySections.some(
      (section) => section != null && Object.hasOwn(section, 'lucide-react'),
    )
  ) {
    throw new Error('forbidden dependency declaration');
  }

  const isCominsTable = manifest.name === 'comins-table';
  if (isCominsTable) {
    if (
      manifest.dependencies?.[radixIcons] !== radixVersion
      || Object.hasOwn(manifest.optionalDependencies ?? {}, radixIcons)
      || Object.hasOwn(manifest.peerDependencies ?? {}, radixIcons)
      || Object.hasOwn(manifest.devDependencies ?? {}, radixIcons)
    ) {
      throw new Error('invalid Radix dependency boundary');
    }
    if (!paths.includes('THIRD_PARTY_NOTICES.md')) throw new Error('missing Radix notice');
    const packedNotice = readPackedFile(filename, 'THIRD_PARTY_NOTICES.md');
    const repositoryNotice = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
    if (packedNotice !== repositoryNotice) throw new Error('Radix notice drift');
  }

  let radixExternalImport = false;
  for (const path of paths.filter((value) => /^dist\/.*\.js$/.test(value))) {
    const source = readPackedFile(filename, path);
    if (/(?:^|\n)\/\/#region node_modules\//.test(source) || /lucide-react/.test(source)) {
      throw new Error('bundled third-party JavaScript');
    }
    if (/(?:from\s*|import\s*)["']@radix-ui\/react-icons["']/.test(source)) {
      radixExternalImport = true;
    }
  }
  if (isCominsTable && !radixExternalImport) throw new Error('missing Radix external import');

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

  if (isCominsTable) {
    for (const path of publicDeclarations) {
      if (!paths.includes(path)) throw new Error('missing public declaration');
      const declaration = readPackedFile(filename, path);
      if (declaration.includes(radixIcons) || /CominsTableIcon(?:Button)?/.test(declaration)) {
        throw new Error('private icon declaration leak');
      }
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
  execFileSync(process.execPath, [licenseChecker, '--artifact', filename], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  process.stdout.write(`${filename}\n`);
} catch {
  process.stderr.write(FAILURE);
  process.exitCode = 1;
}
