import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function stableDiagSummary(rootDir) {
  const p = path.join(rootDir, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry', 'gates', 'manual', 'net_diag.json');
  if (!fs.existsSync(p)) return { ok: false, root_cause_code: 'MISSING', provider_order: [], matrix: [], net_family: 0, hosts: [], digest: '' };
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const matrix = Array.isArray(j.checks)
    ? j.checks.map((r) => ({
      provider: String(r.provider || ''),
      endpoint: String(r.endpoint || ''),
      family: Number(r.family || 0),
      dns_ok: Boolean(r.dns_ok),
      tcp_ok: Boolean(r.tcp_ok),
      tls_ok: Boolean(r.tls_ok),
      http_ok: Boolean(r.http_ok),
      error_class: String(r.error_class || 'NONE'),
      node_error_code: String(r.node_error_code || 'NONE'),
    }))
    : [];
  const provider_order = [...new Set(matrix.map((x) => x.provider))];
  const hosts = Array.isArray(j.hosts) && j.hosts.length ? [...new Set(j.hosts.map((x)=>String(x)))] .sort() : [...new Set(matrix.map((x) => { try { return new URL(x.endpoint).hostname; } catch { return ''; } }).filter(Boolean))].sort();
  const smokePath = path.join(rootDir, 'reports', 'evidence', 'EDGE_PROFIT_00', 'registry', 'gates', 'manual', 'public_smoke.json');
  const smoke = fs.existsSync(smokePath) ? JSON.parse(fs.readFileSync(smokePath, 'utf8')) : null;
  const smoke_summary = smoke ? { reason_code: String(smoke.reason_code || 'NONE'), diag_root_cause_code: String(smoke.diag_root_cause_code || 'NONE'), selected_provider: String(smoke.selected_provider || 'NONE') } : null;
  const payload = JSON.stringify({ provider_order, hosts, net_family: Number(j.net_family || 0), selected_net_family: Number(j.selected_net_family || 0), root_cause_code: String(j.root_cause_code || 'NONE'), smoke_summary });
  const digest = crypto.createHash('sha256').update(payload).digest('hex');
  return { ok: true, root_cause_code: String(j.root_cause_code || 'NONE'), provider_order, matrix, net_family: Number(j.net_family || 0), selected_net_family: Number(j.selected_net_family || 0), hosts, digest };
}
