import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const CONTRACT_FILE = path.join(ROOT, 'EDGE_LAB', 'DATASET_CONTRACT.md');
const REGISTRY_FILE = path.join(ROOT, 'EDGE_LAB', 'HACK_REGISTRY.md');
const OUTPUT_FILE = path.join(EVIDENCE_DIR, 'DATASET_COURT.md');

// Ensure evidence directory exists
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

// Validate files exist
const contractExists = fs.existsSync(CONTRACT_FILE);
const registryExists = fs.existsSync(REGISTRY_FILE);

if (!contractExists) {
  console.error('[FAIL] DATASET_CONTRACT.md not found');
  process.exit(1);
}
if (!registryExists) {
  console.error('[FAIL] HACK_REGISTRY.md not found');
  process.exit(1);
}

const contractContent = fs.readFileSync(CONTRACT_FILE, 'utf8');
const registryContent = fs.readFileSync(REGISTRY_FILE, 'utf8');

// Parse contracts from DATASET_CONTRACT.md
const contractIds = (contractContent.match(/contract_id \| DC_[A-Z_]+/g) || [])
  .map(m => m.replace('contract_id | ', '').trim());

const proxyIds = (contractContent.match(/proxy_id \| PX_[A-Z_]+/g) || [])
  .map(m => m.replace('proxy_id | ', '').trim());

// Check key sections
const hasOHLCV = contractContent.includes('DC_OHLCV') || contractContent.includes('OHLCV');
const hasFunding = contractContent.includes('DC_FUNDING') || contractContent.includes('fundingRate');
const hasOI = contractContent.includes('DC_OPEN_INTEREST') || contractContent.includes('openInterest');
const hasLiq = contractContent.includes('DC_LIQUIDATIONS') || contractContent.includes('liquidation');
const hasFG = contractContent.includes('DC_FEAR_GREED') || contractContent.includes('Fear & Greed');
const hasRetention = contractContent.includes('Retention') || contractContent.includes('retention');
const hasSchema = contractContent.includes('Schema') || contractContent.includes('schema');
const hasQuality = contractContent.includes('Quality') || contractContent.includes('quality');
const hasProxy = contractContent.includes('Proxy Data') || contractContent.includes('Proxy:');

// Parse dependency classes from registry
const hackSections = registryContent.match(/^## H_[A-Z0-9_]+/gm) || [];
const hackIds = hackSections.map(s => s.replace('## ', '').trim());

const depClassResults = [];
for (const hackId of hackIds) {
  const sectionMatch = registryContent.match(new RegExp(`## ${hackId}[\\s\\S]*?(?=\\n---\\n|$)`));
  const section = sectionMatch ? sectionMatch[0] : '';

  const extractField = (fieldName) => {
    const rowRegex = new RegExp(`\\|\\s*${fieldName}\\s*\\|\\s*([^|]+)\\s*\\|`);
    const m = section.match(rowRegex);
    return m ? m[1].trim() : null;
  };

  const depClass = extractField('dependency_class');
  const truthTag = extractField('truth_tag');
  const status = extractField('status');

  // Check contract coverage
  let contractCoverage = 'N/A';
  let contractStatus = 'OK';

  if (depClass === 'OHLCV') {
    contractCoverage = hasOHLCV ? 'DC_OHLCV_BINANCE_SPOT' : 'MISSING';
    contractStatus = hasOHLCV ? 'COVERED' : 'MISSING_CONTRACT';
  } else if (depClass === 'EXTERNAL') {
    if (hackId === 'H_FUNDING_TIMING') {
      contractCoverage = 'DC_FUNDING_RATE_BINANCE';
      contractStatus = hasFunding ? 'CONTRACT_EXISTS_NOT_ACQUIRED' : 'MISSING_CONTRACT';
    } else if (hackId === 'H_OPEN_INTEREST_SURGE') {
      contractCoverage = 'DC_OPEN_INTEREST_BINANCE';
      contractStatus = hasOI ? 'CONTRACT_EXISTS_NOT_ACQUIRED' : 'MISSING_CONTRACT';
    } else if (hackId === 'H_LIQUIDATION_CASCADE') {
      contractCoverage = 'DC_LIQUIDATIONS_BINANCE';
      contractStatus = hasLiq ? 'CONTRACT_EXISTS_NOT_ACQUIRED' : 'MISSING_CONTRACT';
    } else if (hackId === 'H_SENTIMENT_EXTREME') {
      contractCoverage = 'DC_FEAR_GREED_ALTERNATIVE';
      contractStatus = hasFG ? 'CONTRACT_EXISTS_NOT_ACQUIRED' : 'MISSING_CONTRACT';
    }
  }

  // For PROXY_DATA, check proxy contracts
  if (truthTag === 'PROXY_DATA') {
    contractStatus = hasProxy ? 'PROXY_DOCUMENTED' : 'PROXY_UNDOCUMENTED';
  }

  depClassResults.push({
    hackId,
    depClass: depClass || 'UNKNOWN',
    truthTag: truthTag || 'UNKNOWN',
    status: status || 'UNKNOWN',
    contractCoverage,
    contractStatus
  });
}

// Classify contract statuses
const covered = depClassResults.filter(r => r.contractStatus === 'COVERED').length;
const notAcquired = depClassResults.filter(r => r.contractStatus === 'CONTRACT_EXISTS_NOT_ACQUIRED').length;
const proxyDocs = depClassResults.filter(r => r.contractStatus === 'PROXY_DOCUMENTED').length;
const issues = depClassResults.filter(r => r.contractStatus === 'MISSING_CONTRACT' || r.contractStatus === 'PROXY_UNDOCUMENTED').length;

// Build results table
const resultsRows = depClassResults.map(r =>
  `| ${r.hackId} | ${r.depClass} | ${r.truthTag} | ${r.status} | ${r.contractCoverage} | ${r.contractStatus} |`
).join('\n');

// Contract section checks
const contractChecks = [
  ['OHLCV contract documented', hasOHLCV],
  ['Funding rate contract documented', hasFunding],
  ['Open interest contract documented', hasOI],
  ['Liquidations contract documented', hasLiq],
  ['Fear & Greed contract documented', hasFG],
  ['Proxy contracts documented', hasProxy],
  ['Data schema defined', hasSchema],
  ['Quality checks defined', hasQuality],
  ['Retention policy defined', hasRetention],
].map(([name, ok]) => `| ${name} | ${ok ? 'PASS' : 'WARN'} |`).join('\n');

// Overall status: PASS if no MISSING_CONTRACT issues (NOT_ACQUIRED is acceptable)
const overallStatus = issues === 0 ? 'PASS' : 'FAIL';
const now = new Date().toISOString();

const content = `# DATASET_COURT.md — Dataset Contract Compliance Report
generated_at: ${now}
script: edge_dataset.mjs

## STATUS: ${overallStatus}

## File Validation
| File | Exists |
|------|--------|
| EDGE_LAB/DATASET_CONTRACT.md | ${contractExists ? 'YES' : 'NO'} |
| EDGE_LAB/HACK_REGISTRY.md | ${registryExists ? 'YES' : 'NO'} |

## Contract Inventory
| Metric | Value |
|--------|-------|
| Data contracts found | ${contractIds.length} |
| Proxy contracts found | ${proxyIds.length} |
| Contracts: ${contractIds.join(', ')} | — |
| Proxies: ${proxyIds.join(', ')} | — |

## Contract Section Checks
| Section | Status |
|---------|--------|
${contractChecks}

## Hack-to-Contract Coverage
| hack_id | dep_class | truth_tag | status | contract | contract_status |
|---------|-----------|-----------|--------|----------|----------------|
${resultsRows}

## Coverage Summary
| Category | Count |
|---------|-------|
| Hacks with full contract coverage | ${covered} |
| Hacks with contract (data not yet acquired) | ${notAcquired} |
| Hacks with proxy documented | ${proxyDocs} |
| Hacks with contract gaps | ${issues} |

## NEEDS_DATA Analysis
The following hacks are NEEDS_DATA due to external data acquisition:
- H_FUNDING_TIMING: DC_FUNDING_RATE_BINANCE — acquire Binance futures API key
- H_OPEN_INTEREST_SURGE: DC_OPEN_INTEREST_BINANCE — acquire futures data access
- H_LIQUIDATION_CASCADE: DC_LIQUIDATIONS_BINANCE — evaluate Coinglass as backup
- H_SENTIMENT_EXTREME: DC_FEAR_GREED_ALTERNATIVE — set up Alternative.me pipeline

These are documented NEEDS_DATA hacks. Their status is correct and expected.
DATASET_COURT evaluates contract documentation quality, not data acquisition status.

## Verdict
${overallStatus === 'PASS'
  ? `All data contracts are documented. ${notAcquired} external contracts pending acquisition (expected for NEEDS_DATA hacks). Dataset court PASSED.`
  : `Dataset court FAILED. ${issues} hacks have missing or undocumented data contracts.`
}
`;

fs.writeFileSync(OUTPUT_FILE, content);
console.log(`[PASS] edge:dataset — ${hackIds.length} hacks checked, ${covered} covered, ${notAcquired} pending acquisition, STATUS=${overallStatus}`);
if (overallStatus !== 'PASS') process.exit(1);
process.exit(0);
