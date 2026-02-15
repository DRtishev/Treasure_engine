#!/usr/bin/env node
export function createBybitDemoAdapter() {
  if (process.env.CI === 'true') throw new Error('DEMO_ADAPTER_DISABLED_IN_CI');
  if (process.env.ENABLE_DEMO_ADAPTER !== '1') throw new Error('DEMO_ADAPTER_DISABLED');
  return {
    adapter: 'bybit_demo',
    enabled: true,
    mode: 'manual_recon_only',
    submitOrder: async () => {
      throw new Error('DEMO_ADAPTER_NETWORK_STUB: wire manual recon client outside CI/tests');
    }
  };
}
