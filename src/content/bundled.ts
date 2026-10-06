import type { VocabList } from '../schema';

// the lists plugin validates each file at build time and turns it into a JSON module
const modules = import.meta.glob<VocabList>('/lists/*.yaml', { eager: true, import: 'default' });

/** Lists shipped with the game, in file order. */
export function bundledLists(): VocabList[] {
  return Object.keys(modules).sort().map((k) => modules[k]);
}
