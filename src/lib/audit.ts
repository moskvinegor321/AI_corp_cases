import { prisma } from '@/lib/db';

type AuditEvent = {
  actorId?: string | null;
  entityType: 'post' | 'comment' | 'attachment' | 'page' | 'pillar' | 'story' | 'setting';
  entityId: string;
  action: string; // e.g., created, updated, deleted, status_changed
  meta?: Record<string, unknown> | null;
};

export async function auditLog(evt: AuditEvent): Promise<void> {
  // Minimal: store in Setting as JSON append, or prefer dedicated table later
  try {
    const payload = { ts: new Date().toISOString(), ...evt };
    await prisma.setting.upsert({
      where: { key: 'audit_log' },
      create: { key: 'audit_log', value: JSON.stringify([payload]) },
      update: {
        value: await (async () => {
          const row = await prisma.setting.findUnique({ where: { key: 'audit_log' } });
          let arr: unknown[] = [];
          try { arr = row?.value ? JSON.parse(row.value) : []; } catch {}
          const existing = Array.isArray(arr) ? arr : [];
          const next = [payload, ...existing].slice(0, 1000);
          return JSON.stringify(next);
        })(),
      },
    });
  } catch {
    // noop in production; optionally route to external logger
  }
}


