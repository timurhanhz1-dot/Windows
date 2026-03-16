import { ref, push, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../../../firebase';
import { AuditLogEntry, BackofficeRole } from '../types/backoffice.types';

export async function writeAuditLog(
  entry: Omit<AuditLogEntry, 'timestamp'>
): Promise<void> {
  await push(ref(db, 'logs'), {
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export async function getAuditLogs(limit = 500): Promise<(AuditLogEntry & { id: string })[]> {
  const cap = Math.min(limit, 500);
  const q = query(ref(db, 'logs'), orderByChild('timestamp'), limitToLast(cap));
  const snap = await get(q);
  if (!snap.exists()) return [];
  return Object.entries(snap.val())
    .map(([id, v]: any) => ({ id, ...v }))
    .sort((a: any, b: any) => (b.timestamp > a.timestamp ? 1 : -1));
}

export function filterLogs(
  logs: (AuditLogEntry & { id: string })[],
  filters: { action?: string; adminUid?: string; from?: string; to?: string }
) {
  return logs.filter(log => {
    if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
    if (filters.adminUid && log.admin_uid !== filters.adminUid) return false;
    if (filters.from && log.timestamp < filters.from) return false;
    if (filters.to && log.timestamp > filters.to) return false;
    return true;
  });
}
