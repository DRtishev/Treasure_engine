'use strict';

(function initTreasureNetKill() {
  if (process.env.TREASURE_NET_KILL !== '1') {
    return;
  }

  const CODE = 'NETV01';
  const MESSAGE = 'NETWORK_DISABLED_BY_TREASURE_NET_KILL';
  const NAME = 'TreasureNetKillError';

  function netError() {
    const err = new Error(MESSAGE);
    err.code = CODE;
    err.name = NAME;
    return err;
  }

  function thrower() {
    throw netError();
  }

  function patchMethod(obj, key) {
    if (!obj || typeof obj[key] !== 'function') return;
    obj[key] = thrower;
  }

  globalThis.fetch = thrower;

  try {
    const undici = require('undici');
    patchMethod(undici, 'fetch');
    patchMethod(undici, 'request');
    patchMethod(undici, 'stream');
  } catch {}

  try {
    const http = require('node:http');
    patchMethod(http, 'request');
    patchMethod(http, 'get');
  } catch {}

  try {
    const https = require('node:https');
    patchMethod(https, 'request');
    patchMethod(https, 'get');
  } catch {}

  try {
    const dns = require('node:dns');
    patchMethod(dns, 'lookup');
    patchMethod(dns, 'resolve4');
    patchMethod(dns, 'resolve6');
  } catch {}

  try {
    const net = require('node:net');
    patchMethod(net, 'connect');
    patchMethod(net, 'createConnection');
  } catch {}

  try {
    const tls = require('node:tls');
    patchMethod(tls, 'connect');
  } catch {}
})();
