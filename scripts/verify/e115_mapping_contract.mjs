#!/usr/bin/env node
import { PROVIDER_SYMBOL_MAP, PROVIDER_TF_MAP } from '../../core/data/provider_maps.mjs';
const requiredSymbols=['BTCUSDT','ETHUSDT']; const requiredTf=['1m','3m','5m','15m','1h','4h','1d'];
for(const p of ['bybit','binance','kraken','coingecko']){ for(const s of requiredSymbols){ if(!PROVIDER_SYMBOL_MAP[p]?.[s]) throw new Error(`E115_MAP_SYMBOL_MISS:${p}:${s}`);} for(const tf of requiredTf){ if(!PROVIDER_TF_MAP[p]?.[tf]) throw new Error(`E115_MAP_TF_MISS:${p}:${tf}`);} }
console.log('e115_mapping_contract: PASS');
