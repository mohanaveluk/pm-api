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
});
