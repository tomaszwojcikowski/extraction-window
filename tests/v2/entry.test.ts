import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('v2 default entry', () => {
  it('serves the orbit field at / and Phaser at v1.html', () => {
    const index = readFileSync('index.html', 'utf8');
    const v1 = readFileSync('v1.html', 'utf8');
    const v2 = readFileSync('v2.html', 'utf8');
    expect(index).toContain('/src/v2/main.ts');
    expect(index).not.toContain('/src/main.ts');
    expect(v1).toContain('/src/main.ts');
    expect(v1).not.toContain('/src/v2/main.ts');
    expect(v2).toContain("location.replace('./' + location.search + location.hash)");
    expect(v2).not.toContain('/src/v2/main.ts');
  });
});
