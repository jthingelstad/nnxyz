import tokens from '../../data/tokens.json' with { type: 'json' };

const explorers = new Map([
  [1, 'https://etherscan.io'],
  [10, 'https://optimistic.etherscan.io'],
  [100, 'https://gnosisscan.io'],
  [137, 'https://polygonscan.com'],
  [42161, 'https://arbiscan.io'],
]);

export function tezosTokenUrl(contract: string, tokenId: string) {
  if (!/^KT1[1-9A-HJ-NP-Za-km-z]{33}$/.test(contract))
    throw new Error('Invalid Tezos contract');
  if (!/^\d+$/.test(tokenId)) throw new Error('Invalid token ID');
  return `https://objkt.com/tokens/${contract}/${tokenId}`;
}

export function tokenUrl(chainId: number, contract: string, tokenId: string) {
  const explorer = explorers.get(chainId);
  if (!explorer) throw new Error(`Unsupported NFT chain: ${chainId}`);
  if (!/^0x[\da-f]{40}$/i.test(contract))
    throw new Error('Invalid token contract');
  if (!/^\d+$/.test(tokenId)) throw new Error('Invalid token ID');
  return `${explorer}/token/${contract}?a=${tokenId}`;
}

// Link to collected token identities, independently of drawing CIDs or titles.
// data/tokens.json is extracted from the archive by tools/build-token-links.py.
type OwnedToken = {
  chainId: number;
  contract: string;
  tokenId: string;
  owner: string;
};
export function ownedTokens(inkId: string) {
  const owned = (tokens as Record<string, OwnedToken[]>)[inkId];
  if (!owned) throw new Error(`No owned tokens recorded for ${inkId}`);
  return owned.map((token) => ({
    ...token,
    url: tokenUrl(token.chainId, token.contract, token.tokenId),
  }));
}
