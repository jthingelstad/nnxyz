import fs from 'node:fs';

const explorers = new Map([
  [1, 'https://etherscan.io'],
  [100, 'https://gnosisscan.io'],
  [137, 'https://polygonscan.com'],
]);

export function tokenUrl(chainId: number, contract: string, tokenId: string) {
  const explorer = explorers.get(chainId);
  if (!explorer) throw new Error(`Unsupported NFT chain: ${chainId}`);
  if (!/^0x[\da-f]{40}$/i.test(contract))
    throw new Error('Invalid token contract');
  if (!/^\d+$/.test(tokenId)) throw new Error('Invalid token ID');
  return `${explorer}/token/${contract}?a=${tokenId}`;
}

interface OwnedToken {
  chainId: number;
  contract: string;
  tokenId: string;
  owner: string;
}

// Link to collected token identities, independently of drawing CIDs or titles.
export function readProvenance(provenancePath: string) {
  const record: { ownedTokens: OwnedToken[] } = JSON.parse(
    fs.readFileSync(provenancePath, 'utf8'),
  );
  return record.ownedTokens.map((token) => ({
    ...token,
    url: tokenUrl(token.chainId, token.contract, token.tokenId),
  }));
}
