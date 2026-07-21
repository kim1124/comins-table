import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';

const FAILURE = 'repository-hygiene-check: failed\n';
const supportedArguments = new Set(['--staged']);
const args = process.argv.slice(2);
if (args.some((argument) => !supportedArguments.has(argument))) {
  process.stderr.write(FAILURE);
  process.exit(2);
}

const stagedOnly = args.includes('--staged');
const root = gitText(['rev-parse', '--show-toplevel']).trim();
const excludedContent = new Set([
  'scripts/check-repository-hygiene.mjs',
  'test/repository-hygiene.test.ts',
]);
const findings = new Set();
const benchmarkPattern =
  /\b(?:AG Grid|MUI X|MUI Data Grid|TanStack (?:Table|Virtual)|Handsontable|Syncfusion|DevExtreme|KendoReact|ReactDataTable\.com|Tabulator|SlickGrid|Glide Data Grid|PrimeReact DataTable|react-window)\b|@tanstack\/(?:react-)?(?:table|virtual)\b|\bag-grid-(?:community|enterprise|react)\b/giu;
const benchmarkPathPattern =
  /(?:^|\/)(?:benchmarks?|competitors?|comparisons?|research|vendor-snapshots?|benchmark-exports?)(?:\/|$)|(?:^|[/_.-])(?:ag[-_ ]?grid|mui[-_ ]?(?:x|data[-_ ]?grid)|tanstack[-_ ]?(?:table|virtual)|handsontable|syncfusion|devextreme|kendoreact|slickgrid|tabulator|react[-_ ]?window|react[-_ ]?data[-_ ]?table|glide[-_ ]?data[-_ ]?grid|primereact[-_ ]?datatable)(?:[/_.-]|$)/iu;

for (const path of trackedPaths()) {
  if (path === '.local' || path.startsWith('.local/')) findings.add('local-only-path');
  benchmarkPathPattern.lastIndex = 0;
  if (benchmarkPathPattern.test(path)) findings.add('benchmark-path');
  if (excludedContent.has(path)) continue;

  const content = readCandidate(path);
  if (content === null) continue;
  benchmarkPattern.lastIndex = 0;
  if (benchmarkPattern.test(content)) findings.add('benchmark-reference');
}

if (findings.size > 0) {
  process.stderr.write(FAILURE);
  process.exit(1);
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: root || process.cwd(),
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function gitText(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function trackedPaths() {
  return git(['ls-files', '--cached', '-z'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((path) => path.replaceAll('\\', '/').replace(/^\.\//, ''));
}

function readCandidate(path) {
  try {
    if (stagedOnly) return git(['show', `:${path}`]).toString('utf8');
    const absolute = join(root, path);
    const stats = lstatSync(absolute);
    const buffer = stats.isSymbolicLink()
      ? Buffer.from(readlinkSync(absolute), 'utf8')
      : readFileSync(absolute);
    return buffer.toString('utf8');
  } catch (error) {
    if (!stagedOnly && error && typeof error === 'object' && error.code === 'ENOENT') return null;
    throw error;
  }
}
