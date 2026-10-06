import { describe, expect, it } from 'vitest';
import { bundledLists } from '../../src/content/bundled';

describe('bundledLists', () => {
  it('includes the seed list, validated', () => {
    const lists = bundledLists();
    const seed = lists.find((l) => l.list.id === 'de-b2-1000');
    expect(seed).toBeDefined();
    expect(seed!.records.length).toBeGreaterThan(900);
  });
});
