import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';
import { parseList } from '../src/schema/index';
import { parseRaw } from './parse/index';
import { slug } from './parse/headers';
import { findDuplicates, mergeAllDuplicates, mergeRecords, nextBatch, stats, type OrganiseList } from './organise/index';

const USAGE = 'usage: cli.ts validate <list.yaml…> | parse <raw.txt> -o <out.yaml> [--id <id>] [--title <title>] | dupes <list.yaml> | merge-dupes <list.yaml> [--skip <id>…] | merge <list.yaml> <id> <id>… | next-batch <list.yaml> [--n 25] [--category <id>] | stats <list.yaml>';

export function validate(files: string[]): number {
  if (files.length === 0) {
    console.error(USAGE);
    return 1;
  }
  let code = 0;
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`${file}: cannot read file: ${(e as Error).message}`);
      code = 1;
      continue;
    }
    const res = parseList(text);
    if (res.ok) console.log(`ok ${file} (${res.list.records.length} records)`);
    else {
      for (const err of res.errors) console.error(`${file}: ${err}`);
      code = 1;
    }
  }
  return code;
}

export function parse(args: string[]): number {
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const input = args[0];
  const output = flag('-o');
  if (!input || input.startsWith('-') || !output) {
    console.error(USAGE);
    return 1;
  }
  let text: string;
  try {
    text = readFileSync(input, 'utf8');
  } catch (e) {
    console.error(`${input}: cannot read file: ${(e as Error).message}`);
    return 1;
  }
  const id = flag('--id') ?? slug(basename(input, extname(input)));
  const res = parseRaw(text, { id, title: flag('--title') ?? id });
  const doc = {
    schema: 1,
    list: res.list,
    ...(res.categories.length ? { categories: res.categories } : {}),
    records: res.records,
    unresolved: res.unresolved,
  };
  writeFileSync(output, stringify(doc, { lineWidth: 0 }));
  console.log(`wrote ${output}: ${res.records.length} records, ${res.unresolved.length} unresolved`);
  return 0;
}

type Doc = OrganiseList & Record<string, unknown>;

function load(file: string | undefined): Doc | undefined {
  if (!file || file.startsWith('-')) {
    console.error(USAGE);
    return undefined;
  }
  try {
    const doc = parseYaml(readFileSync(file, 'utf8')) as Doc | null;
    if (!doc || !Array.isArray(doc.records)) throw new Error('no records array');
    return doc;
  } catch (e) {
    console.error(`${file}: cannot read list: ${(e as Error).message}`);
    return undefined;
  }
}

interface Flags {
  values: Record<string, string>;
  multi: Record<string, string[]>;
  positional: string[];
}

/** Parse `--name value`, `--name=value` and multi-value flags; undefined (after printing) on bad syntax. */
function parseFlags(args: string[], valueFlags: string[], multiFlags: string[] = []): Flags | undefined {
  const out: Flags = { values: {}, multi: {}, positional: [] };
  for (let i = 0; i < args.length; i++) {
    const tok = args[i];
    if (!tok.startsWith('--')) {
      out.positional.push(tok);
      continue;
    }
    const eq = tok.indexOf('=');
    const name = eq >= 0 ? tok.slice(0, eq) : tok;
    if (multiFlags.includes(name)) {
      const vals = eq >= 0 ? [tok.slice(eq + 1)] : [];
      while (eq < 0 && i + 1 < args.length && !args[i + 1].startsWith('--')) vals.push(args[++i]);
      if (vals.length === 0) {
        console.error(`${name} needs at least one value`);
        return undefined;
      }
      out.multi[name] = [...(out.multi[name] ?? []), ...vals];
    } else if (valueFlags.includes(name)) {
      const val = eq >= 0 ? tok.slice(eq + 1) : args[i + 1];
      if (val === undefined || val === '' || (eq < 0 && val.startsWith('--'))) {
        console.error(`${name} needs a value`);
        return undefined;
      }
      if (eq < 0) i++;
      out.values[name] = val;
    } else {
      console.error(`unknown option '${tok}'\n${USAGE}`);
      return undefined;
    }
  }
  return out;
}

export function organise(cmd: string, args: string[]): number {
  const file = args[0];
  const doc = load(file);
  if (!doc) return 1;
  const flags = parseFlags(
    args.slice(1),
    cmd === 'next-batch' ? ['--n', '--category'] : [],
    cmd === 'merge-dupes' ? ['--skip'] : [],
  );
  if (!flags) return 1;
  const save = (list: OrganiseList) => writeFileSync(file, stringify({ ...doc, records: list.records }, { lineWidth: 0 }));
  if (cmd === 'dupes') {
    const groups = findDuplicates(doc);
    if (groups.length === 0) console.log('no duplicates');
    for (const g of groups) {
      const { conflicts } = mergeRecords(doc, g);
      console.log(g.join(' '));
      for (const c of conflicts) console.log(`CONFLICT ${c}`);
    }
  } else if (cmd === 'merge-dupes') {
    const res = mergeAllDuplicates(doc, flags.multi['--skip'] ?? []);
    for (const c of res.conflicts) console.error(`conflict, not merged: ${c}`);
    if (res.merged.length === 0) {
      console.log('nothing merged');
    } else {
      save(res.list);
      console.log(`merged ${res.merged.length} group(s) in ${file}`);
    }
  } else if (cmd === 'merge') {
    const known = new Set(doc.records.map((r) => r.id));
    const missing = flags.positional.filter((id) => !known.has(id));
    if (flags.positional.length < 2 || missing.length) {
      console.error(missing.length ? `unknown id(s): ${missing.join(' ')}` : USAGE);
      return 1;
    }
    const res = mergeRecords(doc, flags.positional);
    if (res.conflicts.length) {
      for (const c of res.conflicts) console.error(`conflict, not merged: ${c}`);
      return 1;
    }
    save(res.list);
    console.log(`merged ${flags.positional.join(' ')} into ${flags.positional[0]}`);
  } else if (cmd === 'next-batch') {
    const n = flags.values['--n'];
    const count = n === undefined ? 25 : Number(n);
    if (!Number.isInteger(count) || count < 1) {
      console.error(`--n must be a positive integer, got '${n}'`);
      return 1;
    }
    const category = flags.values['--category'];
    if (category !== undefined && !(doc.categories ?? []).some((c) => c.id === category)) {
      console.error(`unknown category '${category}' (declared: ${(doc.categories ?? []).map((c) => c.id).join(', ') || 'none'})`);
      return 1;
    }
    for (const id of nextBatch(doc, count, category)) console.log(id);
  } else {
    const s = stats(doc);
    console.log(`total: ${s.total}`);
    for (const [k, v] of Object.entries(s.status)) console.log(`${k}: ${v}`);
    for (const [k, v] of Object.entries(s.type)) console.log(`${k}: ${v}`);
    for (const c of s.categories) console.log(`category ${c.id || '(none)'} (order ${c.order}): raw ${c.raw}/${c.total}`);
  }
  return 0;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'validate') process.exit(validate(args));
if (cmd === 'parse') process.exit(parse(args));
if (['dupes', 'merge-dupes', 'merge', 'next-batch', 'stats'].includes(cmd)) process.exit(organise(cmd, args));
console.error(USAGE);
process.exit(1);
