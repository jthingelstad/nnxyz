import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenRecords,
  tokenUrl,
  transactionUrl,
  addressUrl,
  networkFor,
} from '../src/lib/provenance.ts';

const contract = '0xcf964c89f509a8c0ac36391c5460df94b91daba5';
const wallet = '0xf872525e4dba6ca8418fe5319b5959de7b947a37';
const hash = `0x${'a'.repeat(64)}`;
const transfer = {
  ink: { id: 'drawing-cid' },
  token: { id: '42' },
  network: 'xdai',
  transactionHash: hash,
  from: { id: contract },
  to: { id: wallet },
  createdAt: '1658332615',
};
const token = {
  chainId: 100,
  tokenId: '42',
  contract,
  owner: wallet,
  snapshotBlock: { number: 48732441, hash },
};
const record = (ownedTokens = [token]) => ({
  inkId: 'drawing-cid',
  ownedTokens,
});

test('explorer links retain large Polygon token IDs as exact decimal strings', () => {
  const id =
    '66971869708281235608242978183358759975370113896863171678736017270563890266175';
  assert.equal(
    tokenUrl(137, contract, id),
    `https://polygonscan.com/token/${contract}?a=${id}`,
  );
  assert.equal(addressUrl(1, wallet), `https://etherscan.io/address/${wallet}`);
  assert.equal(transactionUrl(100, hash), `https://gnosisscan.io/tx/${hash}`);
  assert.throws(() => networkFor(999));
  assert.throws(() => tokenUrl(100, contract, '42&another=1'));
  assert.throws(() => transactionUrl(100, 'not-a-transaction'));
});

test('owned editions stay distinct and duplicate snapshots do not duplicate history', () => {
  const history = {
    tokens: [{ id: '42', network: 'xdai', edition: '7' }],
    tokenTransfers: [
      transfer,
      { ...transfer, token: { id: '99' } },
      { ...transfer, ink: { id: 'another-drawing' } },
    ],
  };
  const tokens = tokenRecords(record([token, { ...token, tokenId: '43' }]), [
    history,
    history,
  ]);
  assert.equal(tokens.length, 2);
  assert.equal(tokens[0].edition, '7');
  assert.equal(tokens[0].transfers.length, 1);
  assert.equal(tokens[1].transfers.length, 0);
  assert.equal(tokens[0].owner, wallet);
});

test('Ethereum upgrade history links to the recorded transaction network', () => {
  const ethToken = { ...token, chainId: 1 };
  const history = {
    tokens: [{ id: '42', network: 'mainnet', edition: '7' }],
    tokenTransfers: [transfer],
  };
  const [result] = tokenRecords(record([ethToken]), [history]);
  assert.equal(result.url, `https://etherscan.io/token/${contract}?a=42`);
  assert.equal(result.transfers[0].url, `https://gnosisscan.io/tx/${hash}`);
  assert.equal(
    result.owner,
    wallet,
    'Indexed history cannot replace snapshot ownership',
  );
  const [unrelated] = tokenRecords(record([ethToken]), [
    { ...history, tokens: [] },
  ]);
  assert.equal(
    unrelated.transfers.length,
    0,
    'Matching token numbers alone cannot establish an upgrade',
  );
});
