import * as path from 'path';
import * as fs from 'fs';

describe('Node.js Type Definitions', () => {
  test('path module types work correctly', () => {
    const testPath = path.join('test', 'path');
    expect(typeof testPath).toBe('string');
  });

  test('fs module types work correctly', () => {
    const exists = fs.existsSync('package.json');
    expect(typeof exists).toBe('boolean');
  });
}); 