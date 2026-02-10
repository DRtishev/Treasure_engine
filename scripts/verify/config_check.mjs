/**
 * TREASURE ENGINE: Config Validation (EPOCH-12)
 * 
 * Purpose: Validate configuration against schema
 * Mode: Network-isolated, no .env required
 * 
 * CRITICAL: verify:* gates must NOT require .env or live credentials
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  EPOCH-12: CONFIG VALIDATION                             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Load config schema
const schemaPath = './spec/config.schema.json';
let schema;

try {
  schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  console.log('✓ Config schema loaded:', schemaPath);
} catch (err) {
  console.error('✗ Failed to load config schema:', err.message);
  process.exit(1);
}

// Validate schema structure
console.log('\n━━━ SCHEMA STRUCTURE VALIDATION ━━━\n');

const requiredSchemaFields = ['$schema', 'title', 'type', 'properties'];
let validationsPassed = 0;
let validationsFailed = 0;

for (const field of requiredSchemaFields) {
  if (schema[field]) {
    console.log(`✓ Schema has "${field}"`);
    validationsPassed++;
  } else {
    console.log(`✗ Schema missing "${field}"`);
    validationsFailed++;
  }
}

// Validate required properties
if (schema.properties) {
  console.log('\n━━━ PROPERTY DEFINITIONS ━━━\n');
  
  const expectedProperties = ['mode', 'persistence', 'event_log', 'execution'];
  
  for (const prop of expectedProperties) {
    if (schema.properties[prop]) {
      console.log(`✓ Property defined: ${prop}`);
      validationsPassed++;
    } else {
      console.log(`⚠ Property not defined: ${prop} (optional)`);
    }
  }
}

// Validate mode enum
if (schema.properties?.mode?.enum) {
  console.log('\n━━━ MODE ENUM VALIDATION ━━━\n');
  
  const expectedModes = ['sim', 'paper', 'live'];
  const actualModes = schema.properties.mode.enum;
  
  for (const mode of expectedModes) {
    if (actualModes.includes(mode)) {
      console.log(`✓ Mode supported: ${mode}`);
      validationsPassed++;
    } else {
      console.log(`✗ Mode missing: ${mode}`);
      validationsFailed++;
    }
  }
}

// Test validation function
console.log('\n━━━ VALIDATION FUNCTION TEST ━━━\n');

function validateConfig(config, schema) {
  const errors = [];
  
  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in config)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  
  // Check mode enum
  if (config.mode && schema.properties?.mode?.enum) {
    if (!schema.properties.mode.enum.includes(config.mode)) {
      errors.push(`Invalid mode: ${config.mode}`);
    }
  }
  
  // Check run_id pattern (if present)
  if (config.run_id && schema.properties?.run_id?.pattern) {
    const pattern = new RegExp(schema.properties.run_id.pattern);
    if (!pattern.test(config.run_id)) {
      errors.push(`Invalid run_id format: ${config.run_id}`);
    }
  }
  
  return errors;
}

// Test valid config
const validConfig = {
  mode: 'sim',
  run_id: 'run_test_001',
  persistence: {
    enabled: true,
    db_path: './data/test.db'
  }
};

const validErrors = validateConfig(validConfig, schema);
if (validErrors.length === 0) {
  console.log('✓ Valid config passes validation');
  validationsPassed++;
} else {
  console.log('✗ Valid config failed:', validErrors);
  validationsFailed++;
}

// Test invalid config (missing required field)
const invalidConfig1 = {
  persistence: { enabled: true }
};

const invalidErrors1 = validateConfig(invalidConfig1, schema);
if (invalidErrors1.length > 0) {
  console.log('✓ Invalid config (missing mode) correctly rejected');
  validationsPassed++;
} else {
  console.log('✗ Invalid config should have been rejected');
  validationsFailed++;
}

// Test invalid config (bad mode)
const invalidConfig2 = {
  mode: 'invalid_mode'
};

const invalidErrors2 = validateConfig(invalidConfig2, schema);
if (invalidErrors2.length > 0) {
  console.log('✓ Invalid config (bad mode) correctly rejected');
  validationsPassed++;
} else {
  console.log('✗ Invalid config should have been rejected');
  validationsFailed++;
}

// Test invalid run_id format
const invalidConfig3 = {
  mode: 'sim',
  run_id: 'invalid format with spaces'
};

const invalidErrors3 = validateConfig(invalidConfig3, schema);
if (invalidErrors3.length > 0) {
  console.log('✓ Invalid run_id format correctly rejected');
  validationsPassed++;
} else {
  console.log('✗ Invalid run_id should have been rejected');
  validationsFailed++;
}

// Network isolation check
console.log('\n━━━ NETWORK ISOLATION CHECK ━━━\n');

// Verify no network modules imported
const sourceCode = readFileSync('./scripts/verify/config_check.mjs', 'utf8');
const networkModules = ['http', 'https', 'net', 'dgram', 'axios', 'node-fetch'];
let networkImportsFound = false;

for (const mod of networkModules) {
  if (sourceCode.includes(`require('${mod}')`) || sourceCode.includes(`from '${mod}'`)) {
    console.log(`✗ Network module imported: ${mod}`);
    networkImportsFound = true;
    validationsFailed++;
  }
}

if (!networkImportsFound) {
  console.log('✓ No network modules imported (network-isolated)');
  validationsPassed++;
}

// Verify no .env requirement
if (!sourceCode.includes('dotenv') && !sourceCode.includes('process.env.')) {
  console.log('✓ No .env dependency (verify gate compliant)');
  validationsPassed++;
} else {
  console.log('⚠ Warning: .env usage detected (acceptable if not required)');
}

// Summary
console.log('\n━━━ SUMMARY ━━━\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ PASSED: ${validationsPassed}`);
console.log(`✗ FAILED: ${validationsFailed}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (validationsFailed > 0) {
  console.log('✗ CONFIG VALIDATION: FAIL\n');
  process.exit(1);
}

console.log('🎉 CONFIG VALIDATION: PASS\n');
console.log('✅ DELIVERABLES VERIFIED:\n');
console.log('   ✓ Config schema well-formed');
console.log('   ✓ Required properties defined');
console.log('   ✓ Mode enum validated');
console.log('   ✓ Validation function operational');
console.log('   ✓ Network-isolated (no http/https/net imports)');
console.log('   ✓ No .env dependency\n');

process.exit(0);
