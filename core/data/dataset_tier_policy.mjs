import fs from 'node:fs';
import path from 'node:path';

function manifestPath(datasetId, kind = 'market') {
  if (kind === 'fills') return path.resolve(`data/manifests/${datasetId}.fills.manifest.json`);
  return path.resolve(`data/manifests/${datasetId}.manifest.json`);
}

export function readDatasetManifest(datasetId, kind = 'market') {
  const p = manifestPath(datasetId, kind);
  if (!fs.existsSync(p)) throw new Error(`DATASET_MANIFEST_MISSING:${datasetId}:${kind}`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { path: p, manifest: data };
}

export function enforceTierPolicy({ market_dataset_id, fills_dataset_id, purpose = 'runtime', strict = false }) {
  const market = readDatasetManifest(market_dataset_id, 'market');
  const fills = readDatasetManifest(fills_dataset_id, 'fills');
  const tiers = {
    market: market.manifest.tag?.tier ?? 'train',
    fills: fills.manifest.tag?.tier ?? 'train'
  };

  if (strict && purpose === 'tuning' && (tiers.market === 'vault' || tiers.fills === 'vault')) {
    const err = new Error('FAIL_VAULT_DATASET_FOR_TUNING');
    err.code = 'FAIL_VAULT_DATASET_FOR_TUNING';
    err.tiers = tiers;
    throw err;
  }

  return {
    purpose,
    strict,
    tiers,
    manifests: {
      market: market.path,
      fills: fills.path
    }
  };
}
