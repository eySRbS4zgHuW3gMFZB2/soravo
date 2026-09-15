import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const VERSION_RE = /^\d{14}_[a-z0-9_]+\.sql$/;

function migrations() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: readFileSync(join(migrationsDir, file), 'utf8') }));
}

function stripComments(sql) {
  return sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function normalize(sql) {
  return stripComments(sql).replace(/\s+/g, ' ').replace(/"/g, '').toLowerCase().trim();
}

function extractGrants(norm) {
  // Captures: privileges clause, relation, target role.
  const re = /\bgrant\s+([\w\s,()]+?)\s+on\s+(?:table\s+)?([a-z_][a-z0-9_.]*)\s+to\s+(anon|authenticated|service_role|public)\b/g;
  const grants = [];
  let m;
  while ((m = re.exec(norm)) !== null) {
    grants.push({ privs: m[1], rel: m[2], role: m[3] });
  }
  return grants;
}

function privilegeTokens(privs) {
  return privs.replace(/\([^)]*\)/g, ' ').split(/[\s,]+/).filter(Boolean);
}

const SECRET_PATTERNS = [
  /\beyJ[0-9A-Za-z_-]{8,}\.eyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\b/,
  /\bsb_(secret|service_role|publishable)_[0-9A-Za-z_-]{10,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk_(live|test)_[0-9A-Za-z]{8,}\b/,
];

describe('Supabase migration discipline', () => {
  const migs = migrations();

  it('has at least one migration', () => {
    expect(migs.length).toBeGreaterThan(0);
  });

  it('follows the timestamped Supabase naming convention', () => {
    for (const { file } of migs) {
      expect(file, `filename ${file}`).toMatch(VERSION_RE);
    }
  });

  it('has strictly increasing, unique migration versions', () => {
    const versions = migs.map((m) => m.file.slice(0, 14));
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions, 'versions must sort in ascending order').toEqual([...versions].sort());
  });

  it('contains no destructive schema operations', () => {
    const forbidden = /\b(drop\s+(table|schema|database)|truncate)\b/i;
    for (const { file, sql } of migs) {
      expect(stripComments(sql), file).not.toMatch(forbidden);
    }
  });

  it('contains no hardcoded secrets, JWTs, or private keys', () => {
    for (const { file, sql } of migs) {
      const bare = stripComments(sql);
      for (const re of SECRET_PATTERNS) {
        expect(bare, `${file} matched ${re}`).not.toMatch(re);
      }
    }
  });

  it('grants table access to anon/authenticated only alongside RLS in the same migration', () => {
    for (const { file, sql } of migs) {
      const norm = normalize(sql);
      for (const grant of extractGrants(norm)) {
        if (grant.role !== 'anon' && grant.role !== 'authenticated') continue;
        const rel = grant.rel.split('.').pop();
        const enabled =
          norm.includes(`enable row level security on ${grant.rel}`) ||
          norm.includes(`enable row level security on ${rel}`);
        expect(enabled, `${file}: grant on ${grant.rel} to ${grant.role} without matching RLS enable`)
          .toBe(true);
      }
    }
  });

  it('never grants anonymous write access', () => {
    for (const { file, sql } of migs) {
      const norm = normalize(sql);
      for (const grant of extractGrants(norm)) {
        if (grant.role !== 'anon' && grant.role !== 'public') continue;
        const toks = privilegeTokens(grant.privs);
        const writes = toks.filter((t) => t === 'all' || ['insert', 'update', 'delete'].includes(t));
        expect(writes, `${file}: anonymous write grant: GRANT ${grant.privs} ON ${grant.rel}`)
          .toHaveLength(0);
      }
    }
  });
});