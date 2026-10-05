import { parseList } from '../src/schema/index';

const LIST_ID = /[\\/]lists[\\/][^\\/]+\.yaml$/;

/** Validates lists/*.yaml with the shared schema and emits them as JSON modules. */
export function listsPlugin() {
  return {
    name: 'typist-lists',
    enforce: 'pre' as const,
    transform(code: string, id: string): string | null {
      // `?raw` / `?url` imports want the file itself, not a validated module.
      if (id.includes('?')) return null;
      const path = id;
      if (!LIST_ID.test(path)) return null;
      const res = parseList(code);
      if (!res.ok) {
        const file = path.slice(path.lastIndexOf('lists'));
        throw new Error(res.errors.map((e) => `${file}: ${e}`).join('\n'));
      }
      return `export default ${JSON.stringify(res.list)};`;
    },
  };
}
