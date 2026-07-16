// The assets Keel accumulates. BTC and ETH are the wedge: they have the deepest SoSoValue
// spot-ETF flow history (the signal) and the most liquid SoDEX spot markets (the execution).
// Expanding the board means adding a row here once the asset has both.
export interface AssetDef {
  id: string; // route slug
  symbol: string; // ticker
  name: string;
  flowSymbol: string; // SoSoValue ETF flow symbol
  spotSymbol: string; // SoDEX spot market name, e.g. "vBTC_vUSDC"
}

export const ASSETS: AssetDef[] = [
  { id: "btc", symbol: "BTC", name: "Bitcoin", flowSymbol: "BTC", spotSymbol: "vBTC_vUSDC" },
  { id: "eth", symbol: "ETH", name: "Ethereum", flowSymbol: "ETH", spotSymbol: "vETH_vUSDC" },
];

export function getAsset(id: string): AssetDef | undefined {
  return ASSETS.find((a) => a.id === id.toLowerCase());
}

export function getAssetBySymbol(symbol: string): AssetDef | undefined {
  return ASSETS.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
}
