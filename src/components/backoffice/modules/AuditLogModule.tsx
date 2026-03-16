import React, { useEffect, useState } from 'react';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { getAuditLogs, filterLogs } from '../services/auditLogService';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';
import { AuditLogEntry } from '../types/backoffice.types';

const PAGE_SIZE = 50;

export default function AuditLogModule() {
  const { role } = useBackofficeAuth();
  const perms = useRoleAccess();
  const { toast, show } = useToast();
  const [logs, setLogs] = useState<(AuditLogEntry & { id: string })[]>([]);
  const [filtered, setFiltered] = useState<(AuditLogEntry & { id: string })[]>([]);
  const [page, setPage] = useState(0);
  const [fAction, setFAction] = useState('');
  const [fAdmin, setFAdmin] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  useEffect(() => {
    getAuditLogs(500).then(setLogs).catch(() => show('Loglar yüklenemedi', 'error'));
  }, []);

  useEffect(() => {
    const result = filterLogs(logs, { action: fAction, adminUid: fAdmin, from: fFrom, to: fTo });
    setFiltered(result); setPage(0);
  }, [logs, fAction, fAdmin, fFrom, fTo]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_logs.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (!perms.canViewAuditLog) return <p style={{ color: '#ef4444' }}>Erişim reddedildi.</p>;

  return (
    <div>
      <PageTitle>Denetim Günlüğü</PageTitle>
      <Toast toast={toast} />
      <div style={{ marginBottom: 12 }}><Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <Input value={fAction} onChange={setFAction} placeholder="Aksiyon filtrele" />
          <Input value={fAdmin} onChange={setFAdmin} placeholder="Admin UID" />
          <Input value={fFrom} onChange={v => setFFrom(v)} type="date" placeholder="Başlangıç" />
          <Input value={fTo} onChange={v => setFTo(v)} type="date" placeholder="Bitiş" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{filtered.length} kayıt</span>
          {perms.canExportAuditLog && <Btn small onClick={exportJson}>JSON İndir</Btn>}
        </div>
      </Card></div>
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#ccc' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Zaman', 'Aksiyon', 'Admin', 'Rol', 'Detay'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString('tr')}</td>
                  <td style={{ padding: '6px 8px', color: '#6366f1', fontWeight: 600 }}>{log.action}</td>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>{log.admin_uid?.slice(0, 8)}…</td>
                  <td style={{ padding: '6px 8px' }}>{log.admin_role}</td>
                  <td style={{ padding: '6px 8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <Btn small disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Önceki</Btn>
            <span style={{ color: '#ccc', fontSize: 13, alignSelf: 'center' }}>{page + 1} / {totalPages}</span>
            <Btn small disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Sonraki ›</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
