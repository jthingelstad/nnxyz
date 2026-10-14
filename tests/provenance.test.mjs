import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readProvenance, tokenUrl } from '../src/lib/provenance.ts';

const contract = '0xcf964c89f509a8c0ac36391c5460df94b91daba5';
const wallet = '0xf872525e4dba6ca8418fe5319b5959de7b947a37';

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

test('collected instances use archived token identities without loading transaction histories', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'nnxyz-nft-link-'));
  try {
    const filename = path.join(folder, 'artwork.json');
    const tokens = [
      { chainId: 100, contract, tokenId: '42', owner: wallet },
      { chainId: 1, contract, tokenId: '42', owner: wallet },
    ];
    fs.writeFileSync(
      filename,
      JSON.stringify({
        ownedTokens: tokens,
        sourceRecords: [{ historyPath: 'unavailable-history.json' }],
      }),
    );
    const links = readProvenance(filename);
    assert.equal(links.length, 2);
    assert.notEqual(
      links[0].url,
      links[1].url,
      'Equal token numbers on different chains remain separate instances',
    );
    assert.equal(links[0].owner, wallet);
    assert.equal(links[0].url, `https://gnosisscan.io/token/${contract}?a=42`);
  } finally {
    fs.rmSync(folder, { recursive: true });
  }
});
