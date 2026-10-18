import { EmailService } from './email.service';
import { EmailStatus, EmailType } from './enums/email.enums';

function setup(options: { sendFails?: boolean; historyFails?: boolean } = {}) {
  const saved: any[] = [];
  const updates: Array<{ where: any; values: any }> = [];
  const repo = {
    create: jest.fn((v: any) => ({ ...v })),
    save: jest.fn(async (v: any) => {
      if (options.historyFails) throw new Error('db down');
      const row = { ...v, id: 42 };
      saved.push({ ...row }); // as written: the service updates its own copy afterwards
      return row;
    }),
    update: jest.fn(async (where: any, values: any) => { updates.push({ where, values }); }),
  };
  const logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
  const notifications = { fromEmail: jest.fn(async () => 1) };
  const service = new EmailService(repo as any, logger as any, notifications as any);
  const sendMail = jest.fn(async () => {
    if (options.sendFails) throw new Error('SMTP refused');
    return { messageId: '<abc@smtp>' };
  });
  (service as any).transporter = { sendMail };
  return { service, saved, updates, sendMail, logger, notifications };
}

const base = {
  to: ['a@x.com', 'b@x.com'],
  subject: 'Review requested: MR-0001',
  html: '<p>Your code is 123456 — open https://app/reset?token=SECRET</p>',
  emailType: EmailType.REVIEW_MATERIAL_REQUISITION,
};

describe('EmailService', () => {
  beforeAll(() => { jest.spyOn(console, 'error').mockImplementation(() => undefined); });

  it('records the email as pending, sends it, then marks it sent', async () => {
    const t = setup();
    const ok = await t.service.sendEmail({
      ...base,
      fromUserId: 'user-1',
      createdBy: 'pm@x.com',
      organizationId: 'org-1',
      reference: { type: 'MATERIAL_REQUISITION', id: 'mr-1' },
      metadata: { mrNumber: 'MR-0001' },
    });

    expect(ok).toBe(true);
    expect(t.saved[0]).toMatchObject({
      emailType: 'REVIEW_MATERIAL_REQUISITION',
      status: EmailStatus.PENDING,
      toEmail: 'a@x.com, b@x.com',
      fromUserId: 'user-1',
      createdBy: 'pm@x.com',
      organizationId: 'org-1',
      referenceType: 'MATERIAL_REQUISITION',
      referenceId: 'mr-1',
      provider: 'SMTP',
      metadata: { mrNumber: 'MR-0001' },
    });
    expect(t.saved[0].guid).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.updates[0]).toEqual({
      where: { id: 42 },
      values: expect.objectContaining({ status: EmailStatus.SENT, providerMessageId: '<abc@smtp>', sentAt: expect.any(Date) }),
    });
  });

  it("puts the sent email in each recipient's notifications, with its final status", async () => {
    const t = setup();
    await t.service.sendEmail(base);
    expect(t.notifications.fromEmail).toHaveBeenCalledWith(expect.objectContaining({ id: 42, status: EmailStatus.SENT }));
  });

  it('marks it failed with the reason when sending fails', async () => {
    const t = setup({ sendFails: true });
    expect(await t.service.sendEmail(base)).toBe(false);
    expect(t.updates[0].values).toMatchObject({ status: EmailStatus.FAILED, errorMessage: 'SMTP refused' });
  });

  it('stores secrets as [REDACTED] but sends them as written', async () => {
    const t = setup();
    await t.service.sendEmail({ ...base, redact: ['123456', 'https://app/reset?token=SECRET', null] });

    expect(t.saved[0].htmlContent).toBe('<p>Your code is [REDACTED] — open [REDACTED]</p>');
    expect(t.sendMail).toHaveBeenCalledWith(expect.objectContaining({ html: base.html }));
  });

  it('still sends when the history cannot be written', async () => {
    const t = setup({ historyFails: true });
    expect(await t.service.sendEmail(base)).toBe(true);
    expect(t.sendMail).toHaveBeenCalled();
    expect(t.logger.error).toHaveBeenCalled();
    expect(t.updates).toEqual([]);
  });
});
