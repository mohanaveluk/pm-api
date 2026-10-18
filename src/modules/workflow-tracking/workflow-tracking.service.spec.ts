import { WorkflowTrackingService } from './workflow-tracking.service';

describe('WorkflowTrackingService', () => {
  const service = new WorkflowTrackingService({} as any, { error: jest.fn() } as any);

  it('generates TRK-XXXXXXXX-XXXXXXXX-XXXXXXXX ids that fit the 30-character column', () => {
    const id = service.generateTrackingId('org-1');
    expect(id).toMatch(/^TRK-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/);
    expect(id).toHaveLength(30);
  });

  it('never repeats and reveals nothing about the previous id', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => service.generateTrackingId('org-1')));
    expect(ids.size).toBe(2000);
  });

  it('refuses to record a step without a tracking id', async () => {
    await expect(service.record({
      organizationId: 'org-1', trackingId: null as unknown as string, entityType: 'MATERIAL_REQUISITION' as any,
      entityId: 'mr-1', action: 'UPDATED' as any,
    })).rejects.toThrow('has no tracking id');
  });

  describe('track', () => {
    const setup = () => {
      const manager: any = {
        update: jest.fn(async () => ({})),
        create: jest.fn((_e: any, v: any) => v),
        save: jest.fn(async (_e: any, v: any) => ({ id: 'ev-1', ...v })),
      };
      const notifications = { fromWorkflowEvent: jest.fn(async () => 1) };
      const svc = new WorkflowTrackingService({ manager } as any, { error: jest.fn() } as any, notifications as any);
      return { svc, manager, notifications };
    };
    class Vendor {}

    it('gives a record its tracking id on the first step, then records and announces it', async () => {
      const t = setup();
      const vendor = { id: 'v-1', organizationId: 'org-1', trackingId: null as string | null };
      await t.svc.track(Vendor, vendor, { entityType: 'VENDOR' as any, action: 'STATUS_CHANGED' as any, toStatus: 'INACTIVE' }, t.manager);

      expect(vendor.trackingId).toMatch(/^TRK-/);
      expect(t.manager.update).toHaveBeenCalledWith(Vendor, { id: 'v-1' }, { trackingId: vendor.trackingId });
      expect(t.manager.save.mock.calls[0][1]).toMatchObject({
        organizationId: 'org-1', trackingId: vendor.trackingId, entityId: 'v-1', toStatus: 'INACTIVE',
      });
      expect(t.notifications.fromWorkflowEvent).toHaveBeenCalled();
    });

    it('keeps an existing tracking id', async () => {
      const t = setup();
      const vendor = { id: 'v-1', organizationId: 'org-1', trackingId: 'TRK-EXISTING' };
      await t.svc.track(Vendor, vendor, { entityType: 'VENDOR' as any, action: 'UPDATED' as any }, t.manager);
      expect(t.manager.update).not.toHaveBeenCalled();
      expect(t.manager.save.mock.calls[0][1].trackingId).toBe('TRK-EXISTING');
    });
  });
});
