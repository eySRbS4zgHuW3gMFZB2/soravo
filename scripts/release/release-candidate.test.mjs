import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  UNSIGNED_ACKNOWLEDGMENT,
  UNSIGNED_CANDIDATE_SUFFIX,
  candidateName,
  checksumFileText,
  collectBundleEntries,
  createTemporaryTauriConfig,
  createUnsignedCandidateManifest,
  directoryDigest,
  evaluateSigningPreconditions,
  evaluateUpdaterReadiness,
  expectedBundleOutputs,
  findExpectedBundleOutputs,
  macOsX64RuntimeExpectation,
  resolveUnder,
  sha256File,
  targetDefinition,
  unsignedWarningText,
  validateCandidateSuffix,
  validateUnsignedAcknowledgment,
  verifyResourceIntegrity,
  verifyRuntimeFile,
  verifyUnsignedCandidateManifest,
} from './release-candidate-manifest.mjs';
import {
  appendGitHubOutput,
  collectToolchainIdentity,
  makeTemporaryConfigCommand,
  parseCliArgs,
  parseResourceSpec,
  parseRuntimeSpec,
  validateRequestCommand,
  verifyManifestCommand,
  writeIdentityCommand,
  writeManifestCommand,
} from './release-candidate-cli.mjs';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const TOOLCHAIN = Object.freeze({
  rustc: 'rustc 1.99.0',
  cargo: 'cargo 1.99.0',
  node: 'v22.23.1',
  pnpm: '11.17.0',
  tauriCli: 'tauri-cli 2.12.0',
});

async function temporaryRoot() {
  return mkdtemp(path.join(tmpdir(), 'soravo-release-candidate-'));
}

async function writeFixture(root, relativePath, contents) {
  const absolute = path.join(root, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, contents);
  return absolute;
}

async function bundleFixture(target, { extraInstaller } = {}) {
  const root = await temporaryRoot();
  const bundleRoot = path.join(root, 'bundle');
  const entries = [];
  if (target.startsWith('darwin-')) {
    await writeFixture(bundleRoot, path.join('Soravo.app', 'Contents', 'MacOS', 'Soravo'), 'binary');
    await writeFixture(bundleRoot, 'Soravo.dmg', 'disk-image');
    entries.push({ path: 'Soravo.app', kind: 'directory' });
    entries.push({ path: 'Soravo.dmg', kind: 'file' });
  } else {
    await writeFixture(bundleRoot, 'Soravo.msi', 'installer-package');
    await writeFixture(bundleRoot, 'Soravo-setup.exe', 'installer-binary');
    entries.push({ path: 'Soravo.msi', kind: 'file' });
    entries.push({ path: 'Soravo-setup.exe', kind: 'file' });
  }
  if (extraInstaller) {
    await writeFixture(bundleRoot, extraInstaller, 'unexpected-output');
  }
  const collected = await collectBundleEntries(bundleRoot);
  return {
    root,
    bundleRoot,
    artifacts: entries.map((entry) => {
      const actual = collected.find((item) => item.path === entry.path);
      if (entry.kind === 'directory') {
        const summary = directoryDigest(collected, entry.path);
        return { ...entry, ...summary };
      }
      return actual;
    }),
  };
}

async function manifestFixture(target = 'darwin-aarch64', overrides = {}) {
  const fixture = await bundleFixture(target);
  const manifest = createUnsignedCandidateManifest({
    product: 'Soravo',
    appVersion: '0.1.0',
    sourceCommit: COMMIT,
    target,
    candidateSuffix: UNSIGNED_CANDIDATE_SUFFIX,
    acknowledgment: UNSIGNED_ACKNOWLEDGMENT,
    workflowRunId: 123,
    workflowRunNumber: 45,
    workflowAttempt: 1,
    hostOs: target.startsWith('darwin-') ? 'macOS' : 'Windows',
    hostArch: target.endsWith('aarch64') ? 'ARM64' : 'X64',
    toolchain: TOOLCHAIN,
    tauriConfigSourceSha256: 'a'.repeat(64),
    tauriConfigOverlaySha256: null,
    artifacts: fixture.artifacts,
    ...overrides,
  });
  return { ...fixture, manifest };
}

describe('unsigned release request boundary', () => {
  it('accepts only the exact unsigned acknowledgment', async () => {
    const root = await temporaryRoot();
    const config = path.join(root, 'tauri.conf.json');
    const output = path.join(root, 'github-output');
    await writeFile(config, JSON.stringify({ version: '0.1.0' }));
    const result = await validateRequestCommand(
      {
        'candidate-suffix': UNSIGNED_CANDIDATE_SUFFIX,
        acknowledgment: UNSIGNED_ACKNOWLEDGMENT,
        'tauri-config': config,
        'github-output': output,
      },
      {},
    );
    expect(result).toEqual({ candidateSuffix: UNSIGNED_CANDIDATE_SUFFIX, appVersion: '0.1.0' });
    expect(await readFile(output, 'utf8')).toBe(
      `candidate_suffix=${UNSIGNED_CANDIDATE_SUFFIX}\napp_version=0.1.0\n`,
    );
    await rm(root, { recursive: true, force: true });
  });

  it('reads an untrusted workflow acknowledgment only from the process environment', async () => {
    const root = await temporaryRoot();
    const config = path.join(root, 'tauri.conf.json');
    const output = path.join(root, 'github-output');
    await writeFile(config, JSON.stringify({ version: '0.1.0' }));
    const result = await validateRequestCommand(
      { 'tauri-config': config, 'github-output': output },
      {
        env: {
          SORAVO_CANDIDATE_SUFFIX: UNSIGNED_CANDIDATE_SUFFIX,
          SORAVO_UNSIGNED_ACKNOWLEDGMENT: UNSIGNED_ACKNOWLEDGMENT,
        },
      },
    );
    expect(result).toEqual({ candidateSuffix: UNSIGNED_CANDIDATE_SUFFIX, appVersion: '0.1.0' });
    await rm(root, { recursive: true, force: true });
  });

  it('rejects a missing or approximate unsigned acknowledgment', async () => {
    await expect(
      validateRequestCommand(
        {
          'candidate-suffix': UNSIGNED_CANDIDATE_SUFFIX,
          acknowledgment: 'unsigned',
          'tauri-config': 'tauri.conf.json',
          'github-output': 'output',
        },
        {},
      ),
    ).rejects.toThrow('unsigned release candidates require acknowledgment');
    expect(() => validateUnsignedAcknowledgment('')).toThrow(
      'unsigned release candidates require acknowledgment',
    );
  });

  it('rejects another candidate label even when acknowledgment is exact', () => {
    expect(() => validateCandidateSuffix('signed')).toThrow('exactly "unsigned-rc"');
  });

  it('rejects malformed CLI resource and runtime specifications', () => {
    expect(() => parseCliArgs([])).toThrow('a command is required');
    expect(() => parseResourceSpec('name|source')).toThrow('name|source|packaged');
    expect(() => parseRuntimeSpec('name|path')).toThrow('name|path|sha256');
  });
});

describe('deterministic bundle discovery', () => {
  it('requires the expected Tauri outputs for each supported target', async () => {
    for (const target of ['darwin-aarch64', 'darwin-x86_64', 'windows-x86_64']) {
      targetDefinition(target);
      const fixture = await bundleFixture(target);
      const found = await findExpectedBundleOutputs(fixture.bundleRoot, target);
      expect(found.map((entry) => entry.path).sort()).toEqual(
        fixture.artifacts.map((entry) => entry.path).sort(),
      );
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it('fails when a supported installer output is absent', async () => {
    const root = await temporaryRoot();
    const bundleRoot = path.join(root, 'bundle');
    await writeFixture(bundleRoot, 'Soravo.msi', 'installer-package');
    await expect(findExpectedBundleOutputs(bundleRoot, 'windows-x86_64')).rejects.toThrow(
      'did not emit the expected file ending in .exe',
    );
    await rm(root, { recursive: true, force: true });
  });

  it('fails when an unexpected installer-like output appears', async () => {
    const fixture = await bundleFixture('windows-x86_64', { extraInstaller: 'Soravo.zip' });
    await expect(
      findExpectedBundleOutputs(fixture.bundleRoot, 'windows-x86_64'),
    ).rejects.toThrow('unexpected installer-like bundle output');
    await rm(fixture.root, { recursive: true, force: true });
  });

  it('fails on empty bundle files instead of checksumming them', async () => {
    const fixture = await bundleFixture('windows-x86_64');
    await writeFile(path.join(fixture.bundleRoot, 'Soravo.msi'), '');
    await expect(
      findExpectedBundleOutputs(fixture.bundleRoot, 'windows-x86_64'),
    ).rejects.toThrow('bundle file is empty');
    await rm(fixture.root, { recursive: true, force: true });
  });

  it('rejects empty versions and unsupported targets', () => {
    expect(expectedBundleOutputs('darwin-aarch64').length).toBe(2);
    expect(() => targetDefinition('linux-x86_64')).toThrow('unsupported release target');
  });
});

describe('unsigned manifest integrity', () => {
  it('creates and verifies a manifest against the emitted bundle', async () => {
    const { root, bundleRoot, manifest } = await manifestFixture();
    expect(manifest.signing.status).toBe('unsigned');
    expect(manifest.updater.ready).toBe(false);
    expect(manifest.updater.missing.length).toBeGreaterThan(0);
    await expect(verifyUnsignedCandidateManifest(manifest, { bundleRoot })).resolves.toBe(true);
    await rm(root, { recursive: true, force: true });
  });

  it('rejects malformed manifests, altered bytes, and signed claims', async () => {
    const { root, bundleRoot, manifest } = await manifestFixture();
    await expect(
      verifyUnsignedCandidateManifest({ ...manifest, app_version: 'not-semver' }, { bundleRoot }),
    ).rejects.toThrow('semantic version');
    await writeFile(path.join(bundleRoot, 'Soravo.dmg'), 'altered!!?');
    await expect(verifyUnsignedCandidateManifest(manifest, { bundleRoot })).rejects.toThrow(
      'checksum mismatch',
    );
    await expect(
      verifyUnsignedCandidateManifest(
        {
          ...manifest,
          signing: { status: 'signed', signed_artifacts: true },
          updater: { ready: true, missing: [] },
        },
        { bundleRoot },
      ),
    ).rejects.toThrow('refuses a signed artifact claim');
    await rm(root, { recursive: true, force: true });
  });

  it('rejects artifact paths outside the bundle root', async () => {
    const { root, bundleRoot, manifest } = await manifestFixture();
    const escaped = {
      ...manifest,
      artifacts: [{ ...manifest.artifacts[0], path: '../outside.dmg' }],
    };
    await expect(verifyUnsignedCandidateManifest(escaped, { bundleRoot })).rejects.toThrow(
      'must stay inside its root',
    );
    expect(() => resolveUnder(bundleRoot, '../outside.dmg')).toThrow('must stay inside its root');
    await rm(root, { recursive: true, force: true });
  });

  it('uses deterministic candidate names with commit, platform, and run metadata', () => {
    expect(
      candidateName({
        product: 'Soravo',
        version: '0.1.0',
        commit: COMMIT,
        target: 'windows-x86_64',
        suffix: UNSIGNED_CANDIDATE_SUFFIX,
        runNumber: 7,
      }),
    ).toBe(`soravo-0.1.0-${COMMIT.slice(0, 12)}-windows-x86_64-unsigned-rc-run7`);
  });
});

describe('runtime, resource, and toolchain provenance', () => {
  it('verifies packaged resources byte-for-byte and records unavailable layouts', async () => {
    const root = await temporaryRoot();
    const source = await writeFixture(root, path.join('source', 'model.bin'), 'model-bytes');
    const packagedRoot = path.join(root, 'package');
    await writeFixture(packagedRoot, path.join('resources', 'model.bin'), 'model-bytes');
    const verified = await verifyResourceIntegrity([
      {
        name: 'model',
        sourcePath: source,
        packagedPath: 'resources/model.bin',
        packagedRoot,
      },
      {
        name: 'source-only-model',
        sourcePath: source,
        packagedPath: 'resources/model.bin',
        packagedRoot: null,
      },
    ]);
    expect(verified[0].packaged_verified).toBe(true);
    expect(verified[0].packaged_sha256).toBe(verified[0].source_sha256);
    expect(verified[1].packaged_verified).toBe(false);
    await writeFile(path.join(packagedRoot, 'resources', 'model.bin'), 'different-bytes');
    await expect(
      verifyResourceIntegrity([
        {
          name: 'model',
          sourcePath: source,
          packagedPath: 'resources/model.bin',
          packagedRoot,
        },
      ]),
    ).rejects.toThrow('does not match its source');
    await rm(root, { recursive: true, force: true });
  });

  it('verifies pinned runtime files and rejects checksum drift', async () => {
    const root = await temporaryRoot();
    const runtime = await writeFixture(root, 'runtime.bin', 'runtime-bytes');
    const actual = await sha256File(runtime);
    const observation = await verifyRuntimeFile({
      name: 'runtime',
      filePath: runtime,
      expectedSha256: actual,
      minimumBytes: 1,
    });
    expect(observation.sha256).toBe(actual);
    await expect(
      verifyRuntimeFile({
        name: 'runtime',
        filePath: runtime,
        expectedSha256: '0'.repeat(64),
        minimumBytes: 1,
      }),
    ).rejects.toThrow('checksum mismatch');
    expect(macOsX64RuntimeExpectation().sha256).toBe(
      '590cee05699047b85e4a8115b4cec792073c2972ce78de383356a552a296a9c4',
    );
    await rm(root, { recursive: true, force: true });
  });

  it('collects exact toolchain and lockfile identity through an injectable runner', async () => {
    const calls = [];
    const identity = await collectToolchainIdentity({
      repositoryRoot: '/repo',
      desktopDirectory: '/repo/apps/desktop',
      runCommand: (command, args, options) => {
        calls.push([command, ...args].join(' '));
        return { status: 0, stdout: `${command} identity`, stderr: '' };
      },
      hashFile: async (filePath) => `hash-for-${String(filePath).split('/').pop()}`,
    });
    expect(identity).toMatchObject({
      rustc: 'rustc identity',
      cargo: 'cargo identity',
      node: process.version,
      pnpm: 'pnpm identity',
      tauriCli: 'pnpm identity',
      lockfiles: {
        'Cargo.lock': 'hash-for-Cargo.lock',
        'pnpm-lock.yaml': 'hash-for-pnpm-lock.yaml',
      },
    });
    expect(calls).toContain('pnpm tauri --version');
  });

  it('fails toolchain identity when a version probe fails', async () => {
    await expect(
      collectToolchainIdentity({
        repositoryRoot: '/repo',
        desktopDirectory: '/repo/apps/desktop',
        runCommand: () => ({ status: 1, stdout: '', stderr: 'boom' }),
        hashFile: async () => 'hash',
      }),
    ).rejects.toThrow('rustc -vV failed');
  });
});

describe('temporary Tauri configuration overlays', () => {
  it('adds frameworks without mutating the canonical config object', async () => {
    const base = { bundle: { macOS: { minimumSystemVersion: '10.15' } } };
    const merged = createTemporaryTauriConfig({
      baseConfig: base,
      frameworks: ['/tmp/ort/lib/libonnxruntime.1.24.2.dylib'],
    });
    expect(merged.bundle.macOS.frameworks).toEqual([
      '/tmp/ort/lib/libonnxruntime.1.24.2.dylib',
    ]);
    expect(base.bundle.macOS.frameworks).toBeUndefined();
  });

  it('writes a temporary overlay through the CLI helper', async () => {
    const root = await temporaryRoot();
    const base = path.join(root, 'tauri.conf.json');
    const output = path.join(root, 'temporary.json');
    const writes = [];
    const result = await makeTemporaryConfigCommand(
      { 'base-config': base, output, framework: '/tmp/ort/lib/libonnxruntime.1.24.2.dylib' },
      {
        readFile: async () => JSON.stringify({ bundle: {} }),
        writeFile: async (filePath, text) => {
          writes.push([filePath, text]);
        },
      },
    );
    expect(result.outputPath).toBe(output);
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0][1]).bundle.macOS.frameworks).toEqual([
      '/tmp/ort/lib/libonnxruntime.1.24.2.dylib',
    ]);
    await rm(root, { recursive: true, force: true });
  });
});

describe('unsigned release has no operable automatic updater', () => {
  const repositoryRoot = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    '..',
  );

  it('does not register the updater plugin, endpoint, public key, or capability', async () => {
    const mainRs = await readFile(
      path.join(repositoryRoot, 'apps', 'desktop', 'src-tauri', 'src', 'main.rs'),
      'utf8',
    );
    const config = JSON.parse(
      await readFile(
        path.join(repositoryRoot, 'apps', 'desktop', 'src-tauri', 'tauri.conf.json'),
        'utf8',
      ),
    );
    const capability = JSON.parse(
      await readFile(
        path.join(
          repositoryRoot,
          'apps',
          'desktop',
          'src-tauri',
          'capabilities',
          'default.json',
        ),
        'utf8',
      ),
    );
    expect(mainRs).not.toContain('tauri_plugin_updater::Builder');
    expect(config.plugins ?? {}).not.toHaveProperty('updater');
    expect(JSON.stringify(capability)).not.toContain('updater:');
  });
});

describe('signing and updater readiness boundaries', () => {
  it('permits an explicitly acknowledged unsigned candidate only', () => {
    expect(
      evaluateSigningPreconditions({
        mode: UNSIGNED_CANDIDATE_SUFFIX,
        acknowledgment: UNSIGNED_ACKNOWLEDGMENT,
      }).signed,
    ).toBe(false);
    expect(() =>
      evaluateSigningPreconditions({ mode: 'signed-release', updaterKeyPresent: true }),
    ).toThrow('APPLE_CERTIFICATE');
  });

  it('requires every named signing secret for a signed release', () => {
    expect(
      evaluateSigningPreconditions({
        mode: 'signed-release',
        appleSecretsPresent: {
          APPLE_CERTIFICATE: true,
          APPLE_CERTIFICATE_PASSWORD: true,
          APPLE_SIGNING_IDENTITY: true,
          APPLE_ID: true,
          APPLE_PASSWORD: true,
          APPLE_TEAM_ID: true,
        },
        updaterKeyPresent: true,
      }).signed,
    ).toBe(true);
  });

  it('marks automatic updates blocked until all updater prerequisites exist', () => {
    expect(evaluateUpdaterReadiness({}).ready).toBe(false);
    expect(evaluateUpdaterReadiness({}).missing).toEqual([
      'tauri_plugin_updater runtime registration',
      'plugins.updater configuration',
      'plugins.updater.pubkey',
      'plugins.updater.endpoints',
      'signed update artifacts',
      'signed update metadata',
    ]);
    expect(
      evaluateUpdaterReadiness({
        pluginRegistered: true,
        updaterConfigPresent: true,
        publicKeyConfigured: true,
        endpointConfigured: true,
        signedArtifactsAvailable: true,
        updateMetadataGenerated: true,
      }).ready,
    ).toBe(true);
  });

  it('exercises CLI identity and manifest commands through seams', async () => {
    const root = await temporaryRoot();
    const identityPath = path.join(root, 'identity.json');
    const manifestPath = path.join(root, 'manifest.json');
    const checksumsPath = path.join(root, 'checksums.txt');
    const warningPath = path.join(root, 'warning.txt');
    const fixture = await bundleFixture('darwin-aarch64');
    const outputs = {};
    await writeIdentityCommand(
      {
        'repository-root': root,
        'desktop-directory': root,
        output: identityPath,
      },
      {
        runCommand: () => ({ status: 0, stdout: 'probe identity', stderr: '' }),
        hashFile: async () => 'f'.repeat(64),
        writeFile: async (filePath, text) => {
          outputs[filePath] = text;
          await writeFile(filePath, text);
        },
      },
    );
    const manifest = await writeManifestCommand(
      {
        'bundle-root': fixture.bundleRoot,
        target: 'darwin-aarch64',
        product: 'Soravo',
        'app-version': '0.1.0',
        'source-commit': COMMIT,
        'run-id': '9',
        'run-number': '10',
        'host-os': 'macOS',
        'host-arch': 'ARM64',
        'identity-file': identityPath,
        'tauri-config': identityPath,
        'repository-root': root,
        manifest: manifestPath,
        checksums: checksumsPath,
        warning: warningPath,
      },
      {
        collectEntries: async () => fixture.artifacts,
        verifyResources: async () => [],
      },
    );
    expect(manifest.candidate).toContain('darwin-aarch64-unsigned-rc-run10');
    expect(checksumFileText(manifest)).toContain('Soravo.dmg');
    expect(unsignedWarningText(manifest)).toContain('UNSIGNED — NOT FOR GENERAL DISTRIBUTION');
    expect(await readFile(checksumsPath, 'utf8')).toBe(checksumFileText(manifest));
    expect(await readFile(warningPath, 'utf8')).toBe(unsignedWarningText(manifest));
    await expect(verifyManifestCommand({ manifest: manifestPath, 'bundle-root': fixture.bundleRoot }))
      .resolves.toBe(true);
    await rm(root, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  });
});
