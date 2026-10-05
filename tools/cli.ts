import { readFileSync } from 'node:fs';
import { parseList } from '../src/schema/index';

const USAGE = 'usage: cli.ts validate <list.yaml…>';

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

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'validate') process.exit(validate(args));
console.error(USAGE);
process.exit(1);
