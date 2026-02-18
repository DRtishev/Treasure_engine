#!/usr/bin/env node
import fs from 'node:fs';
if(!fs.existsSync('artifacts/incoming/FINAL_VALIDATED.zip')) throw new Error('E123_PACK_MISSING_FINAL_VALIDATED');
if(!fs.existsSync('artifacts/incoming/E123_evidence.tar.gz')) throw new Error('E123_PACK_MISSING_TAR');
