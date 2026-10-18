import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The analyzer always indents the manifest. Tools read it, not people, so it ships without the
// indentation, which is about half its size (specs/package-contract.md §7).
const file = fileURLToPath(new URL('../custom-elements.json', import.meta.url));
writeFileSync(file, JSON.stringify(JSON.parse(readFileSync(file, 'utf8'))));
