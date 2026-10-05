import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { stringify } from 'yaml';
import { parseList } from '../src/schema/index';
import { parseRaw } from './parse/index';
import { slug } from './parse/headers';

const USAGE = 'usage: cli.ts validate <list.yaml…> | parse <raw.txt> -o <out.yaml> [--id <id>] [--title <title>]';

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

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'validate') process.exit(validate(args));
if (cmd === 'parse') process.exit(parse(args));
console.error(USAGE);
process.exit(1);
