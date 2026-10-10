// Never clobber the owner's Illustrator work. art/.generated.json records the hash of every
// file the generator wrote; if a file changed since (or was saved by Illustrator, or its
// vehicle.json says "art": "hand"), the generator writes <name>.generated.svg beside it instead.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export const ART_DIR = resolve(import.meta.dirname, '../../art');
const MANIFEST = resolve(ART_DIR, '.generated.json');

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

function readManifest(): Record<string, string> {
  return existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
}

export type WriteResult = 'written' | 'unchanged' | 'protected';

export function isHandEdited(file: string, locked = false): boolean {
  if (!existsSync(file)) return false;
  if (locked) return true;
  const cur = readFileSync(file, 'utf8');
  if (/Adobe Illustrator/i.test(cur)) return true;
  const key = relative(ART_DIR, file);
  const rec = readManifest()[key];
  return !rec || rec !== sha(cur);
}

export function writeProtected(file: string, content: string, opts: { force?: boolean; locked?: boolean } = {}): WriteResult {
  const key = relative(ART_DIR, file);
  if (existsSync(file) && readFileSync(file, 'utf8') === content) return 'unchanged';
  if (!opts.force && isHandEdited(file, opts.locked)) {
    writeFileSync(file.replace(/\.svg$/, '.generated.svg'), content);
    return 'protected';
  }
  writeFileSync(file, content);
  const m = readManifest();
  m[key] = sha(content);
  writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(m).sort()), null, 2) + '\n');
  return 'written';
}
