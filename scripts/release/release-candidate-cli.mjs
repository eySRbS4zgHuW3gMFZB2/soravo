import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promises as fs } from 'node:fs';
import {
  UNSIGNED_ACKNOWLEDGMENT,
  UNSIGNED_CANDIDATE_SUFFIX,
  candidateName,
  checksumFileText,
  createTemporaryTauriConfig,
  createUnsignedCandidateManifest,
  findExpectedBundleOutputs,
  macOsX64RuntimeExpectation,
  readTauriAppVersion,
  sha256File,
  targetDefinition,
  unsignedWarningText,
  validateAppVersion,
  validateCandidateSuffix,
  validateCommit,
  validatePositiveInteger,
  validateUnsignedAcknowledgment,
  verifyResourceIntegrity,
  verifyRuntimeFile,
  verifyUnsignedCandidateManifest,
} from './release-candidate-manifest.mjs';

function usageError(message) {
  const error = new Error(message);
  error.code = 'USAGE';
  throw error;
}

export function parseCliArgs(argv) {
  const args = { command: null, options: {} };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      if (args.command) usageError(`unexpected positional argument: ${token}`);
      args.command = token;
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    if (!rawKey) usageError('empty option name');
    let value = inlineValue;
    if (value === undefined) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) {
        value = true;
      } else {
        value = next;
        index += 1;
      }
    }
    const existing = args.options[rawKey];
    if (existing === undefined) {
      args.options[rawKey] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      args.options[rawKey] = [existing, value];
    }
  }
  if (!args.command) usageError('a command is required');
  return args;
}

export function requireTextOption(options, name) {
  const value = options[name];
  if (typeof value !== 'string' || value.length === 0) {
    usageError(`--${name} is required`);
  }
  return value;
}

export function optionalTextOption(options, name, fallback = null) {
  const value = options[name];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') usageError(`--${name} must be text`);
  return value;
}

export function requireIntegerOption(options, name) {
  const text = requireTextOption(options, name);
  const value = Number(text);
  return validatePositiveInteger(value, name);
}

export function asStringArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseResourceSpec(spec) {
  if (typeof spec !== 'string') usageError('resource specifications must be text');
  const [name, source, packaged, expectedSha256] = spec.split('|');
  if (!name || !source || !packaged || expectedSha256?.includes('|')) {
    usageError('resource specifications must use name|source|packaged[|expected-sha256]');
  }
  return { name, source, packaged, expectedSha256: expectedSha256 || undefined };
}

export function parseRuntimeSpec(spec) {
  if (typeof spec !== 'string') usageError('runtime specifications must be text');
  const [name, filePath, expectedSha256, minimumBytes] = spec.split('|');
  if (!name || !filePath || !expectedSha256) {
    usageError('runtime specifications must use name|path|sha256[|minimum-bytes]');
  }
  const minimum = minimumBytes === undefined ? 1 : Number(minimumBytes);
  if (!Number.isSafeInteger(minimum) || minimum < 1) {
    usageError('runtime minimum bytes must be a positive integer');
  }
  return { name, filePath, expectedSha256, minimumBytes: minimum };
}

export function appendGitHubOutput(outputPath, values, writeFile = fs.appendFile) {
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    usageError('GitHub output path is required');
  }
  const lines = Object.entries(values).map(([key, value]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) usageError(`invalid output name: ${key}`);
    return `${key}=${String(value)}`;
  });
  return writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

export async function collectToolchainIdentity({
  repositoryRoot,
  desktopDirectory,
  runCommand,
  hashFile = sha256File,
} = {}) {
  if (!repositoryRoot || !desktopDirectory || !runCommand) {
    usageError('toolchain identity requires repository, desktop, and command runner inputs');
  }
  function commandText(command, args, options = {}) {
    const result = runCommand(command, args, { encoding: 'utf8', ...options });
    if (!result || result.status !== 0) {
      const detail = String(result?.stderr ?? result?.error ?? 'command failed').slice(0, 500);
      throw new Error(`${command} ${args.join(' ')} failed: ${detail}`);
    }
    return String(result.stdout ?? '').trim();
  }
  const rustc = commandText('rustc', ['-vV']);
  const cargo = commandText('cargo', ['--version']);
  const pnpm = commandText('pnpm', ['--version']);
  const tauriCli = commandText('pnpm', ['tauri', '--version'], { cwd: desktopDirectory });
  const lockfiles = {
    'Cargo.lock': await hashFile(path.join(repositoryRoot, 'Cargo.lock')),
    'pnpm-lock.yaml': await hashFile(path.join(repositoryRoot, 'pnpm-lock.yaml')),
  };
  return Object.freeze({
    rustc,
    cargo,
    node: process.version,
    pnpm,
    tauriCli,
    lockfiles: Object.freeze(lockfiles),
  });
}

export async function validateRequestCommand(
  options,
  {
    readFile = fs.readFile,
    appendOutput = appendGitHubOutput,
    readTauriVersion = readTauriAppVersion,
    env = process.env,
  } = {},
) {
  const explicitSuffix = options['candidate-suffix'];
  const explicitAcknowledgment = options.acknowledgment;
  // ASVS V1.2: workflow_dispatch text is untrusted. Prefer explicit CLI options
  // in tests, but read GitHub expressions only through process environment in CI
  // so shell interpolation cannot execute acknowledgement text.
  const candidateSuffix = typeof explicitSuffix === 'string' && explicitSuffix.length > 0
    ? explicitSuffix
    : env.SORAVO_CANDIDATE_SUFFIX ?? '';
  const acknowledgment = typeof explicitAcknowledgment === 'string' && explicitAcknowledgment.length > 0
    ? explicitAcknowledgment
    : env.SORAVO_UNSIGNED_ACKNOWLEDGMENT ?? '';
  const tauriConfig = requireTextOption(options, 'tauri-config');
  const githubOutput = requireTextOption(options, 'github-output');
  validateCandidateSuffix(candidateSuffix);
  validateUnsignedAcknowledgment(acknowledgment);
  const raw = await readFile(tauriConfig, 'utf8');
  const config = JSON.parse(raw);
  const appVersion = readTauriVersion(config?.version);
  await appendOutput(githubOutput, {
    candidate_suffix: candidateSuffix,
    app_version: appVersion,
  });
  return { candidateSuffix, appVersion };
}

export async function writeIdentityCommand(
  options,
  { runCommand, hashFile = sha256File, writeFile = fs.writeFile } = {},
) {
  const repositoryRoot = requireTextOption(options, 'repository-root');
  const desktopDirectory = requireTextOption(options, 'desktop-directory');
  const outputPath = requireTextOption(options, 'output');
  const identity = await collectToolchainIdentity({
    repositoryRoot,
    desktopDirectory,
    runCommand,
    hashFile,
  });
  await writeFile(outputPath, `${JSON.stringify(identity, null, 2)}\n`, 'utf8');
  return identity;
}

export async function makeTemporaryConfigCommand(
  options,
  { readFile = fs.readFile, writeFile = fs.writeFile } = {},
) {
  const baseConfigPath = requireTextOption(options, 'base-config');
  const outputPath = requireTextOption(options, 'output');
  const frameworks = asStringArray(options.framework);
  if (frameworks.length === 0) usageError('at least one --framework path is required');
  const baseConfig = JSON.parse(await readFile(baseConfigPath, 'utf8'));
  const merged = createTemporaryTauriConfig({ baseConfig, frameworks });
  const text = `${JSON.stringify(merged, null, 2)}\n`;
  await writeFile(outputPath, text, 'utf8');
  return { outputPath, sha256: (await import('node:crypto')).createHash('sha256').update(text).digest('hex') };
}

export async function verifyRuntimeCommand(options, { verifyFile = verifyRuntimeFile } = {}) {
  const specs = asStringArray(options.runtime);
  if (specs.length === 0) usageError('at least one --runtime specification is required');
  const observations = [];
  for (const spec of specs) {
    observations.push(await verifyFile(parseRuntimeSpec(spec)));
  }
  return observations;
}

export async function writeManifestCommand(
  options,
  {
    collectEntries = findExpectedBundleOutputs,
    verifyResources = verifyResourceIntegrity,
    verifyFile = verifyRuntimeFile,
    readFile = fs.readFile,
    writeFile = fs.writeFile,
  } = {},
) {
  const bundleRoot = requireTextOption(options, 'bundle-root');
  const target = requireTextOption(options, 'target');
  const product = requireTextOption(options, 'product');
  const candidateSuffix = optionalTextOption(options, 'candidate-suffix', UNSIGNED_CANDIDATE_SUFFIX);
  const acknowledgment = optionalTextOption(options, 'acknowledgment', UNSIGNED_ACKNOWLEDGMENT);
  const appVersion = requireTextOption(options, 'app-version');
  const sourceCommit = requireTextOption(options, 'source-commit');
  const workflowRunId = requireIntegerOption(options, 'run-id');
  const workflowRunNumber = requireIntegerOption(options, 'run-number');
  const workflowAttempt = options['run-attempt'] === undefined
    ? 1
    : requireIntegerOption(options, 'run-attempt');
  const hostOs = optionalTextOption(options, 'host-os', 'unknown');
  const hostArch = optionalTextOption(options, 'host-arch', 'unknown');
  const identityFile = requireTextOption(options, 'identity-file');
  const tauriConfig = requireTextOption(options, 'tauri-config');
  const tauriOverlay = optionalTextOption(options, 'tauri-overlay', null);
  const packagedRoot = optionalTextOption(options, 'packaged-root', null);
  const manifestPath = requireTextOption(options, 'manifest');
  const checksumsPath = optionalTextOption(options, 'checksums', null);
  const warningPath = optionalTextOption(options, 'warning', null);
  targetDefinition(target);
  validateAppVersion(appVersion);
  validateCommit(sourceCommit);

  const artifacts = await collectEntries(bundleRoot, target);
  const resourceSpecs = asStringArray(options.resource).map(parseResourceSpec);
  const resourceEntries = resourceSpecs.map((spec) => ({
    name: spec.name,
    sourcePath: path.isAbsolute(spec.source)
      ? spec.source
      : path.join(requireTextOption(options, 'repository-root'), spec.source),
    packagedPath: spec.packaged,
    expectedSha256: spec.expectedSha256,
    packagedRoot: packagedRoot === 'unknown' ? null : packagedRoot,
  }));
  const resources = resourceEntries.length
    ? await verifyResources(resourceEntries)
    : [];
  const runtimeSpecs = asStringArray(options.runtime).map(parseRuntimeSpec);
  const runtimeObservations = [];
  for (const spec of runtimeSpecs) {
    runtimeObservations.push(await verifyFile(spec));
  }
  const toolchain = JSON.parse(await readFile(identityFile, 'utf8'));
  const tauriConfigSourceSha256 = await sha256File(tauriConfig);
  const tauriConfigOverlaySha256 = tauriOverlay ? await sha256File(tauriOverlay) : null;
  const manifest = createUnsignedCandidateManifest({
    product,
    appVersion,
    sourceCommit,
    target,
    candidateSuffix,
    acknowledgment,
    workflowRunId,
    workflowRunNumber,
    workflowAttempt,
    hostOs,
    hostArch,
    toolchain,
    tauriConfigSourceSha256,
    tauriConfigOverlaySha256,
    artifacts,
    resources,
    runtime: Object.freeze({
      observations: runtimeObservations,
      macos_x86_64_ort: target === 'darwin-x86_64' ? macOsX64RuntimeExpectation() : null,
    }),
    updater: {},
  });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await verifyUnsignedCandidateManifest(manifest, { bundleRoot });
  if (checksumsPath) {
    await writeFile(checksumsPath, checksumFileText(manifest), 'utf8');
  }
  if (warningPath) {
    await writeFile(warningPath, unsignedWarningText(manifest), 'utf8');
  }
  return manifest;
}

export async function verifyManifestCommand(options) {
  const manifestPath = requireTextOption(options, 'manifest');
  const bundleRoot = requireTextOption(options, 'bundle-root');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  await verifyUnsignedCandidateManifest(manifest, { bundleRoot });
  return true;
}

export async function runCli(argv, dependencies = {}) {
  const { command, options } = parseCliArgs(argv);
  switch (command) {
    case 'validate-request':
      return validateRequestCommand(options, dependencies);
    case 'write-identity':
      return writeIdentityCommand(options, dependencies);
    case 'make-temporary-config':
      return makeTemporaryConfigCommand(options, dependencies);
    case 'verify-runtime':
      return verifyRuntimeCommand(options, dependencies);
    case 'write-manifest':
      return writeManifestCommand(options, dependencies);
    case 'verify-manifest':
      return verifyManifestCommand(options);
    default:
      usageError(`unknown command: ${command}`);
  }
}

const invokedAsScript = (() => {
  try {
    return pathToFileURL(process.argv[1] ?? '').href === import.meta.url;
  } catch {
    return false;
  }
})();

if (invokedAsScript) {
  runCli(process.argv.slice(2)).then(
    () => {},
    (error) => {
      // `12_SECURITY_BASELINE.md`: fail with actionable text, never secret values. None of the
      // CLI inputs accept secrets, and errors echo only paths/labels/checksums.
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = error?.code === 'USAGE' ? 2 : 1;
    },
  );
}
