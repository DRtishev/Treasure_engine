#!/usr/bin/env node
import crypto from 'node:crypto';
import { modeE123, runDirE123, writeMdAtomic } from '../verify/e123_lib.mjs';

const mode = modeE123();
const reqEnv = ['BYBIT_API_KEY','BYBIT_API_SECRET'];
const has = Object.fromEntries(reqEnv.map((k)=>[k, Boolean(process.env[k]) ]));
const armed = process.env.ENABLE_NET==='1'&&process.env.I_UNDERSTAND_LIVE_RISK==='1'&&mode==='ONLINE_REQUIRED'&&process.env.ARM_LIVE_PLACEMENT==='1'&&process.env.CONFIRM_LIVE_PLACEMENT==='YES'&&String(process.env.LIVE_ARM_TOKEN||'').length>=8;
const ttl = Number(process.env.ARM_EXPIRES_SEC || 300);
const start = Number(process.env.E123_ARM_START_EPOCH || Math.floor(Date.now()/1000));
const now = Math.floor(Date.now()/1000);
const expired = now - start > ttl;
const salt = crypto.createHash('sha256').update(runDirE123()).digest('hex').slice(0,16);
const tokenHash = process.env.LIVE_ARM_TOKEN ? crypto.createHash('sha256').update(`${process.env.LIVE_ARM_TOKEN}:${salt}`).digest('hex') : 'NONE';

writeMdAtomic('reports/evidence/E123/TESTNET_AUTH_PRECHECK.md',[
 '# E123 TESTNET AUTH PRECHECK',`- mode: ${mode}`,...reqEnv.map(k=>`- ${k}_present: ${has[k]}`),`- arming_requested: ${process.env.ARM_LIVE_PLACEMENT==='1'}`,
 `- arming_effective: ${armed && !expired}`,`- arm_expired: ${expired}`,`- reason_code: ${expired?'E_ARM_EXPIRED':(armed?'OK':'E_NOT_ARMED')}`
].join('\n'));

writeMdAtomic('reports/evidence/E123/ARMING_PROOF.md',[
 '# E123 ARMING PROOF',`- token_hash: ${tokenHash}`,`- token_consumed: ${armed && !expired}`,
 `- gates: ENABLE_NET=${process.env.ENABLE_NET==='1'},I_UNDERSTAND_LIVE_RISK=${process.env.I_UNDERSTAND_LIVE_RISK==='1'},ONLINE_REQUIRED=${mode==='ONLINE_REQUIRED'},ARM_LIVE_PLACEMENT=${process.env.ARM_LIVE_PLACEMENT==='1'},CONFIRM_LIVE_PLACEMENT=${process.env.CONFIRM_LIVE_PLACEMENT==='YES'},TOKEN_LEN_OK=${String(process.env.LIVE_ARM_TOKEN||'').length>=8}`,
 `- arm_expires_sec: ${ttl}`
].join('\n'));
