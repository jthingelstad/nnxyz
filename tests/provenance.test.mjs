import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ownedTokens, tokenUrl } from '../src/lib/provenance.ts';

const contract = '0xcf964c89f509a8c0ac36391c5460df94b91daba5';

test('NFT links retain exact token identities including large Polygon IDs', () => {
  const id =
    '66971869708281235608242978183358759975370113896863171678736017270563890266175';
  assert.equal(
    tokenUrl(137, contract, id),
    `https://polygonscan.com/token/${contract}?a=${id}`,
  );
  assert.equal(
    tokenUrl(100, contract, '42'),
    `https://gnosisscan.io/token/${contract}?a=42`,
  );
  assert.equal(
    tokenUrl(1, contract, '42'),
    `https://etherscan.io/token/${contract}?a=42`,
  );
  assert.throws(() => tokenUrl(999, contract, '42'));
  assert.throws(() => tokenUrl(100, contract, '42&another=1'));
  assert.throws(() => tokenUrl(100, 'not-a-contract', '42'));
});

test('collected instances link every extracted token identity', () => {
  const tokens = JSON.parse(fs.readFileSync('data/tokens.json', 'utf8'));
  const [cid, owned] = Object.entries(tokens).find(([, t]) => t.length > 1);
  const links = ownedTokens(cid);
  assert.equal(links.length, owned.length);
  assert.equal(
    new Set(links.map((link) => link.url)).size,
    links.length,
    'Each owned edition keeps its own token link',
  );
  assert.equal(links[0].owner, owned[0].owner);
  assert.throws(() => ownedTokens('QmNotInTheCollection'));
});
