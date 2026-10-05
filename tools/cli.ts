import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';
import { parseList } from '../src/schema/index';
import { parseRaw } from './parse/index';
import { slug } from './parse/headers';
import { findDuplicates, mergeAllDuplicates, nextBatch, stats, type OrganiseList } from './organise/index';

const USAGE = 'usage: cli.ts validate <list.yaml…> | parse <raw.txt> -o <out.yaml> [--id <id>] [--title <title>] | dupes <list.yaml> | merge-dupes <list.yaml> | next-batch <list.yaml> [--n 25] [--category <id>] | stats <list.yaml>';

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

export function organise(cmd: string, args: string[]): number {
  const doc = load(args[0]);
  if (!doc) return 1;
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  if (cmd === 'dupes') {
    const groups = findDuplicates(doc);
    if (groups.length === 0) console.log('no duplicates');
    for (const g of groups) console.log(g.join(' '));
  } else if (cmd === 'merge-dupes') {
    const groups = findDuplicates(doc);
    writeFileSync(args[0], stringify({ ...doc, records: mergeAllDuplicates(doc).records }, { lineWidth: 0 }));
    console.log(`merged ${groups.length} group(s) in ${args[0]}`);
  } else if (cmd === 'next-batch') {
    const n = flag('--n');
    const count = n === undefined ? 25 : Number(n);
    if (!Number.isInteger(count) || count < 1) {
      console.error(USAGE);
      return 1;
    }
    for (const id of nextBatch(doc, count, flag('--category'))) console.log(id);
  } else {
    const s = stats(doc);
    console.log(`total: ${s.total}`);
    for (const [k, v] of Object.entries(s.status)) console.log(`${k}: ${v}`);
    for (const [k, v] of Object.entries(s.type)) console.log(`${k}: ${v}`);
  }
  return 0;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'validate') process.exit(validate(args));
if (cmd === 'parse') process.exit(parse(args));
if (['dupes', 'merge-dupes', 'next-batch', 'stats'].includes(cmd)) process.exit(organise(cmd, args));
console.error(USAGE);
process.exit(1);
