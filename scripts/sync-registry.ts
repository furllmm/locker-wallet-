import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const url = 'https://raw.githubusercontent.com/trustwallet/wallet-core/master/registry.json';
const target = resolve('src/network/registry.json');

const response = await fetch(url);
if (!response.ok) throw new Error(`Wallet Core registry download failed: ${response.status}`);
const text = await response.text();
JSON.parse(text);
await mkdir(dirname(target), { recursive: true });
await writeFile(target, text, 'utf8');
console.log(`Synced Wallet Core registry -> ${target}`);
