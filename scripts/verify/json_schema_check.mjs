#!/usr/bin/env node
// scripts/verify/json_schema_check.mjs
// Lightweight JSON Schema checker (no external deps).
// Supports the subset used by this repo's schemas.

import fs from 'fs';
import path from 'path';
import { getLatestRunDir } from '../../core/sys/run_artifacts.mjs';

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isInteger(n) {
  return typeof n === 'number' && Number.isFinite(n) && Math.floor(n) === n;
}

function isNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function isDateTimeString(s) {
  if (typeof s !== 'string') return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

function pushErr(errors, p, msg) {
  errors.push(`${p || '$'}: ${msg}`);
}

function validateType(schemaType, value) {
  if (schemaType === 'object') return isObject(value);
  if (schemaType === 'array') return Array.isArray(value);
  if (schemaType === 'string') return typeof value === 'string';
  if (schemaType === 'number') return isNumber(value);
  if (schemaType === 'integer') return isInteger(value);
  if (schemaType === 'boolean') return typeof value === 'boolean';
  if (schemaType === 'null') return value === null;
  return true; // unknown type → ignore
}

function validateSchema(schema, value, p, errors) {
  if (!schema || typeof schema !== 'object') return;

  // type
  if (typeof schema.type === 'string') {
    if (!validateType(schema.type, value)) {
      pushErr(errors, p, `expected type ${schema.type}`);
      return;
    }
  } else if (Array.isArray(schema.type)) {
    const ok = schema.type.some(t => validateType(t, value));
    if (!ok) {
      pushErr(errors, p, `expected type in [${schema.type.join(', ')}]`);
      return;
    }
  }

  // enum
  if (Array.isArray(schema.enum)) {
    if (!schema.enum.includes(value)) {
      pushErr(errors, p, `expected enum ${JSON.stringify(schema.enum)}`);
    }
  }

  // string constraints
  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      pushErr(errors, p, `minLength ${schema.minLength} violated`);
    }
    if (typeof schema.format === 'string') {
      if (schema.format === 'date-time' && !isDateTimeString(value)) {
        pushErr(errors, p, `invalid date-time format`);
      }
    }
  }

  // number constraints
  if (isNumber(value)) {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      pushErr(errors, p, `minimum ${schema.minimum} violated`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      pushErr(errors, p, `maximum ${schema.maximum} violated`);
    }
  }

  // object
  if (isObject(value)) {
    const props = isObject(schema.properties) ? schema.properties : {};

    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in value)) pushErr(errors, p, `missing required property '${key}'`);
      }
    }

    for (const [key, subSchema] of Object.entries(props)) {
      if (key in value) validateSchema(subSchema, value[key], p ? `${p}.${key}` : key, errors);
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) pushErr(errors, p, `additionalProperties not allowed: '${key}'`);
      }
    } else if (isObject(schema.additionalProperties)) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) validateSchema(schema.additionalProperties, value[key], p ? `${p}.${key}` : key, errors);
      }
    }
  }

  // array
  if (Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      validateSchema(schema.items, value[i], `${p || '$'}[${i}]`, errors);
    }
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}


function resolveTargetPath(targetPath) {
  if (targetPath === 'reports') {
    const latestRunDir = getLatestRunDir();
    return latestRunDir;
  }

  if (targetPath.startsWith('reports/')) {
    const latestRunDir = getLatestRunDir();
    return path.join(latestRunDir, path.basename(targetPath));
  }

  return targetPath;
}

function listJsonFiles(schemaBasename, targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];

  const files = fs.readdirSync(targetPath).filter(f => f.toLowerCase().endsWith('.json'));

  // Repo convention:
  // - sim_report.schema validates only per-mode hack reports (hack_*_{mode}_report.json)
  // - other reports (eqs_report.json, court_report.json, etc.) are validated separately
  let filtered = files;
  if (schemaBasename.includes('sim_report')) {
    filtered = files.filter(f => f.startsWith('hack_') && f.endsWith('_report.json'));
  }

  return filtered.map(f => path.join(targetPath, f));
}

function main() {
  const [schemaPath, targetPathRaw] = process.argv.slice(2);
  if (!schemaPath || !targetPathRaw) {
    console.error('Usage: node scripts/verify/json_schema_check.mjs <schema.json> <target.json|dir>');
    process.exit(2);
  }

  const targetPath = resolveTargetPath(targetPathRaw);
  const schema = readJson(schemaPath);
  const schemaBasename = path.basename(schemaPath).toLowerCase();
  const targets = listJsonFiles(schemaBasename, targetPath);

  let total = 0;
  let failed = 0;
  for (const t of targets) {
    total++;
    let data;
    try {
      data = readJson(t);
    } catch (e) {
      failed++;
      console.error(`[schema] FAIL: ${t}`);
      console.error(`  JSON parse error: ${e.message}`);
      continue;
    }

    const errors = [];
    validateSchema(schema, data, '', errors);

    if (errors.length) {
      failed++;
      console.error(`[schema] FAIL: ${t}`);
      for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
      if (errors.length > 50) console.error(`  ... ${errors.length - 50} more`);
    } else {
      console.log(`[schema] PASS: ${t}`);
    }
  }

  if (failed > 0) {
    console.error(`[schema] SUMMARY: failed ${failed}/${total}`);
    process.exit(1);
  }
  console.log(`[schema] SUMMARY: pass ${total}/${total}`);
}

main();
