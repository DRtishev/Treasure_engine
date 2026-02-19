import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const EVIDENCE_DIR = path.join(ROOT, 'reports', 'evidence', 'EDGE_LAB');
const REGISTRY_FILE = path.join(ROOT, 'EDGE_LAB', 'HACK_REGISTRY.md');
const SCHEMA_FILE = path.join(ROOT, 'EDGE_LAB', 'HACK_SCHEMA.md');
const OUTPUT_FILE = path.join(EVIDENCE_DIR, 'REGISTRY_COURT.md');

// Ensure evidence directory exists
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

// Read registry
if (!fs.existsSync(REGISTRY_FILE)) {
  console.error('[FAIL] HACK_REGISTRY.md not found at', REGISTRY_FILE);
  process.exit(1);
}

const registryContent = fs.readFileSync(REGISTRY_FILE, 'utf8');
const schemaExists = fs.existsSync(SCHEMA_FILE);

// Parse hacks from registry (find ## H_ sections)
const hackSections = registryContent.match(/^## H_[A-Z0-9_]+/gm) || [];
const hackIds = hackSections.map(s => s.replace('## ', '').trim());
const totalHacks = hackIds.length;

// Required fields per schema
const requiredFields = [
  'hack_id', 'name', 'status', 'dependency_class', 'truth_tag',
  'hypothesis', 'entry_logic', 'exit_logic', 'timeframes', 'instruments',
  'params', 'created_at', 'updated_at', 'trials_count', 'oos_periods'
];

// Parse status counts
const statusCounts = {};
const depClassCounts = {};
const truthTagCounts = {};
const complianceResults = [];

for (const hackId of hackIds) {
  // Find the section for this hack
  const sectionRegex = new RegExp(`## ${hackId}[\\s\\S]*?(?=^## H_|$)`, 'm');
  const match = registryContent.match(new RegExp(`## ${hackId}[\\s\\S]*?(?=\\n---\\n|$)`));
  const section = match ? match[0] : '';

  // Extract fields from table rows
  const extractField = (fieldName) => {
    const rowRegex = new RegExp(`\\|\\s*${fieldName}\\s*\\|\\s*([^|]+)\\s*\\|`);
    const m = section.match(rowRegex);
    return m ? m[1].trim() : null;
  };

  const status = extractField('status');
  const depClass = extractField('dependency_class');
  const truthTag = extractField('truth_tag');
  const trialsCount = extractField('trials_count');
  const proxyDef = extractField('proxy_definition');

  statusCounts[status] = (statusCounts[status] || 0) + 1;
  depClassCounts[depClass] = (depClassCounts[depClass] || 0) + 1;
  truthTagCounts[truthTag] = (truthTagCounts[truthTag] || 0) + 1;

  // Schema compliance checks
  const issues = [];
  for (const field of requiredFields) {
    const val = extractField(field);
    if (!val) issues.push(`Missing field: ${field}`);
  }

  // Special rule: PROXY_DATA requires proxy_definition
  if (truthTag === 'PROXY_DATA' && !proxyDef) {
    issues.push('PROXY_DATA truth_tag requires proxy_definition field');
  }

  // Special rule: UNAVAILABLE status must be NEEDS_DATA
  if (truthTag === 'UNAVAILABLE' && status !== 'NEEDS_DATA') {
    issues.push(`UNAVAILABLE truth_tag requires status=NEEDS_DATA (got ${status})`);
  }

  complianceResults.push({
    hackId,
    status: status || 'UNKNOWN',
    depClass: depClass || 'UNKNOWN',
    truthTag: truthTag || 'UNKNOWN',
    trialsCount: trialsCount || '0',
    issues,
    compliant: issues.length === 0
  });
}

const totalCompliant = complianceResults.filter(r => r.compliant).length;
const totalNonCompliant = complianceResults.filter(r => !r.compliant).length;
const overallStatus = totalNonCompliant === 0 && totalHacks >= 10 ? 'PASS' : 'FAIL';

// Build compliance table
const complianceRows = complianceResults.map(r => {
  const icon = r.compliant ? 'OK' : 'FAIL';
  const issueStr = r.issues.length > 0 ? r.issues.join('; ') : 'None';
  return `| ${r.hackId} | ${r.status} | ${r.depClass} | ${r.truthTag} | ${r.trialsCount} | ${icon} | ${issueStr} |`;
}).join('\n');

const statusTable = Object.entries(statusCounts)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join('\n');

const depClassTable = Object.entries(depClassCounts)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join('\n');

const truthTagTable = Object.entries(truthTagCounts)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join('\n');

const now = new Date().toISOString();

const content = `# REGISTRY_COURT.md — Registry Validation Report
generated_at: ${now}
script: edge_registry.mjs

## STATUS: ${overallStatus}

## Summary
| Metric | Value |
|--------|-------|
| Total hacks in registry | ${totalHacks} |
| Schema compliant | ${totalCompliant} |
| Schema violations | ${totalNonCompliant} |
| Schema file present | ${schemaExists ? 'YES' : 'NO'} |
| Registry file present | YES |
| Minimum hack count (>=10) | ${totalHacks >= 10 ? 'PASS' : 'FAIL'} |

## Status Distribution
| Status | Count |
|--------|-------|
${statusTable}

## Dependency Class Distribution
| dependency_class | Count |
|-----------------|-------|
${depClassTable}

## Truth Tag Distribution
| truth_tag | Count |
|-----------|-------|
${truthTagTable}

## Schema Compliance Results
| hack_id | status | dep_class | truth_tag | trials | schema | issues |
|---------|--------|-----------|-----------|--------|--------|--------|
${complianceRows}

## Hack List
${hackIds.map((h, i) => `${i + 1}. ${h}`).join('\n')}

## Verdict
${overallStatus === 'PASS'
  ? `All ${totalHacks} hacks validated. Schema compliance: ${totalCompliant}/${totalHacks}. Registry court PASSED.`
  : `Registry court FAILED. ${totalNonCompliant} schema violations found. Total hacks: ${totalHacks} (minimum required: 10).`
}
`;

fs.writeFileSync(OUTPUT_FILE, content);
console.log(`[PASS] edge:registry — ${totalHacks} hacks validated, ${totalCompliant}/${totalHacks} schema compliant, STATUS=${overallStatus}`);
if (overallStatus !== 'PASS') process.exit(1);
process.exit(0);
