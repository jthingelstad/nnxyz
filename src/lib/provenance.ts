import fs from 'node:fs';
import path from 'node:path';

const networks = new Map([
  [1, { name: 'Ethereum', explorer: 'https://etherscan.io' }],
  [100, { name: 'Gnosis', explorer: 'https://gnosisscan.io' }],
  [137, { name: 'Polygon', explorer: 'https://polygonscan.com' }],
]);
export function networkFor(chainId: number) {
  const network = networks.get(chainId);
  if (!network) throw new Error(`Unsupported provenance chain: ${chainId}`);
  return network;
}
function address(value: string) {
  if (!/^0x[\da-f]{40}$/i.test(value)) throw new Error('Invalid address');
  return value;
}
export const addressUrl = (chainId: number, value: string) =>
  `${networkFor(chainId).explorer}/address/${address(value)}`;
export function tokenUrl(chainId: number, contract: string, tokenId: string) {
  if (!/^\d+$/.test(tokenId)) throw new Error('Invalid token ID');
  return `${networkFor(chainId).explorer}/token/${address(contract)}?a=${tokenId}`;
}
export function transactionUrl(chainId: number, hash: string) {
  if (!/^0x[\da-f]{64}$/i.test(hash))
    throw new Error('Invalid transaction hash');
  return `${networkFor(chainId).explorer}/tx/${hash}`;
}
export const blockUrl = (chainId: number, block: number) => {
  if (!Number.isSafeInteger(block) || block < 0)
    throw new Error('Invalid block');
  return `${networkFor(chainId).explorer}/block/${block}`;
};
export const shortIdentifier = (value: string) =>
  `${value.slice(0, 8)}…${value.slice(-6)}`;
export const recordedDate = (timestamp: string) =>
  new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);

interface Transfer {
  token: { id: string };
  ink: { id: string };
  from: { id: string };
  to: { id: string };
  network: string;
  createdAt: string;
  transactionHash: string;
}
interface History {
  tokens: { id: string; network: string; edition?: string }[];
  tokenTransfers: Transfer[];
}
interface OwnedToken {
  chainId: number;
  contract: string;
  tokenId: string;
  owner: string;
  snapshotBlock: { number: number; hash: string };
  indexedTokenRecord?: { edition?: string };
}
interface ArchiveRecord {
  inkId: string;
  ownedTokens: OwnedToken[];
  sourceRecords: { historyPath: string }[];
}
const historyChain = (network: string) =>
  network === 'xdai' || network === 'gnosis'
    ? 100
    : network === 'mainnet' || network === 'ethereum'
      ? 1
      : undefined;

// Keep snapshot ownership separate from indexed history, especially upgraded tokens.
export function tokenRecords(record: ArchiveRecord, histories: History[]) {
  return record.ownedTokens.map((token) => {
    const indexed = histories
      .flatMap((history) => history.tokens)
      .find(
        (item) =>
          item.id === token.tokenId &&
          historyChain(item.network) === token.chainId,
      );
    const seen = new Set<string>();
    const transfers = histories
      .flatMap((history) => history.tokenTransfers)
      .filter(
        (transfer) =>
          transfer.ink.id === record.inkId &&
          transfer.token.id === token.tokenId,
      )
      .flatMap((transfer) => {
        const chainId = historyChain(transfer.network);
        // Gnosis history for an Ethereum token is included only with the archived upgrade identity.
        if (
          !chainId ||
          (chainId !== token.chainId &&
            !(
              token.chainId === 1 &&
              indexed?.network === 'mainnet' &&
              chainId === 100
            ))
        )
          return [];
        const key = `${chainId}:${transfer.transactionHash}:${transfer.from.id}:${transfer.to.id}:${transfer.createdAt}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [
          {
            ...transfer,
            chainId,
            url: transactionUrl(chainId, transfer.transactionHash),
          },
        ];
      })
      .sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    return {
      ...token,
      network: networkFor(token.chainId),
      url: tokenUrl(token.chainId, token.contract, token.tokenId),
      edition: token.indexedTokenRecord?.edition ?? indexed?.edition,
      transfers,
    };
  });
}

export function readProvenance(provenancePath: string) {
  const record: ArchiveRecord = JSON.parse(
    fs.readFileSync(provenancePath, 'utf8'),
  );
  const histories: History[] = record.sourceRecords.map((source) =>
    JSON.parse(
      fs.readFileSync(path.join('collection', source.historyPath), 'utf8'),
    ),
  );
  return tokenRecords(record, histories);
}
