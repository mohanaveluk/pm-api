import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { MasterCodeService, MasterSequenceKey } from './master-code.service';
import { MasterCodeCounter } from '../entities/master-code-counter.entity';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';

describe('MasterCodeService', () => {
  let service: MasterCodeService;
  let dataSource: any;
  let queryRunner: any;

  beforeEach(async () => {
    queryRunner = {
      connect:             jest.fn(),
      startTransaction:    jest.fn(),
      commitTransaction:   jest.fn(),
      rollbackTransaction: jest.fn(),
      release:             jest.fn(),
      manager: {
        create:  jest.fn((_e: any, v: any) => v),
        save:    jest.fn(async (_e: any, v: any) => v),
        findOne: jest.fn(async () => null),
      },
    };
    dataSource = { createQueryRunner: jest.fn(() => queryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterCodeService,
        { provide: getRepositoryToken(MasterCodeCounter), useValue: { findOne: jest.fn(), save: jest.fn() } },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(MasterCodeService);
  });

  describe('generateCode', () => {
    it('starts at 0001 for a brand-new organization and master', async () => {
      // No counter row yet: it is inserted at 0, then incremented to 1.
      let call = 0;
      queryRunner.manager.findOne.mockImplementation(async () =>
        ++call === 1 ? null : { organizationId: ORG_A, sequenceKey: 'X', lastSequence: 0 },
      );

      const code = await service.generateCode(
        queryRunner, ORG_A, MasterSequenceKey.MATERIAL_CATEGORY,
      );

      expect(code).toBe('0001');
    });

    it('increments by one on each call', async () => {
      const counter = { organizationId: ORG_A, sequenceKey: 'X', lastSequence: 0 };
      queryRunner.manager.findOne.mockResolvedValue(counter);
      queryRunner.manager.save.mockImplementation(async (_e: any, v: any) => {
        counter.lastSequence = v.lastSequence;
        return v;
      });

      const codes: string[] = [];
      for (let i = 0; i < 5; i++) {
        codes.push(await service.generateCode(queryRunner, ORG_A, MasterSequenceKey.MATERIAL_GROUP));
      }

      expect(codes).toEqual(['0001', '0002', '0003', '0004', '0005']);
    });

    it('zero-pads to four digits and widens beyond 9999', async () => {
      const cases: Array<[number, string]> = [
        [0, '0001'], [8, '0009'], [9, '0010'], [98, '0099'],
        [99, '0100'], [998, '0999'], [999, '1000'], [9998, '9999'], [9999, '10000'],
      ];

      for (const [last, expected] of cases) {
        queryRunner.manager.findOne.mockResolvedValue({ lastSequence: last });
        const code = await service.generateCode(
          queryRunner, ORG_A, MasterSequenceKey.UNIT_OF_MEASUREMENT,
        );
        expect(code).toBe(expected);
      }
    });

    it('takes a pessimistic write lock on the counter row', async () => {
      queryRunner.manager.findOne.mockResolvedValue({ lastSequence: 0 });

      await service.generateCode(queryRunner, ORG_A, MasterSequenceKey.INDUSTRY_CATEGORY);

      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(
        MasterCodeCounter,
        expect.objectContaining({
          where: { organizationId: ORG_A, sequenceKey: MasterSequenceKey.INDUSTRY_CATEGORY },
          lock:  { mode: 'pessimistic_write' },
        }),
      );
    });

    it('keeps each master and each organization on its own sequence', async () => {
      const counters: Record<string, { lastSequence: number }> = {};
      queryRunner.manager.findOne.mockImplementation(async (_e: any, opts: any) => {
        const key = `${opts.where.organizationId}:${opts.where.sequenceKey}`;
        counters[key] ??= { lastSequence: 0 };
        return counters[key];
      });
      queryRunner.manager.save.mockImplementation(async (_e: any, v: any) => v);

      const a1 = await service.generateCode(queryRunner, ORG_A, MasterSequenceKey.MATERIAL_CATEGORY);
      const a2 = await service.generateCode(queryRunner, ORG_A, MasterSequenceKey.MATERIAL_CATEGORY);
      const b1 = await service.generateCode(queryRunner, ORG_B, MasterSequenceKey.MATERIAL_CATEGORY);
      const g1 = await service.generateCode(queryRunner, ORG_A, MasterSequenceKey.MATERIAL_GROUP);

      expect([a1, a2]).toEqual(['0001', '0002']);
      // Separate organization and separate master both restart at 0001.
      expect(b1).toBe('0001');
      expect(g1).toBe('0001');
    });

    it('issues no duplicates across serialised concurrent callers', async () => {
      // The row lock serialises transactions, so model one shared counter row
      // accessed under mutual exclusion.
      const counter = { lastSequence: 0 };
      let chain = Promise.resolve();
      const runLocked = async <T>(fn: () => Promise<T>): Promise<T> => {
        const previous = chain;
        let release: () => void;
        chain = new Promise<void>(r => (release = r));
        await previous;
        try { return await fn(); } finally { release(); }
      };

      queryRunner.manager.findOne.mockResolvedValue(counter);
      queryRunner.manager.save.mockImplementation(async (_e: any, v: any) => {
        counter.lastSequence = v.lastSequence;
        return v;
      });

      const codes = await Promise.all(
        Array.from({ length: 100 }, () =>
          runLocked(() => service.generateCode(queryRunner, ORG_A, MasterSequenceKey.MATERIAL_CATEGORY)),
        ),
      );

      expect(new Set(codes).size).toBe(100);
      expect(codes).toContain('0001');
      expect(codes).toContain('0100');
    });

    it('recovers when it loses the race to insert the first counter row', async () => {
      const winner = { lastSequence: 4 };
      let findCalls = 0;
      queryRunner.manager.findOne.mockImplementation(async () =>
        ++findCalls === 1 ? null : winner,
      );
      queryRunner.manager.save.mockImplementation(async (_e: any, v: any) => {
        if (findCalls === 1 && v.lastSequence === 0) {
          const err: any = new Error('duplicate'); err.code = 'ER_DUP_ENTRY'; throw err;
        }
        return v;
      });

      // Re-reads the winning row and continues its sequence rather than failing.
      const code = await service.generateCode(queryRunner, ORG_A, MasterSequenceKey.MATERIAL_GROUP);
      expect(code).toBe('0005');
    });

    it('propagates a non-duplicate insert failure', async () => {
      queryRunner.manager.findOne.mockResolvedValue(null);
      queryRunner.manager.save.mockRejectedValue(new Error('disk full'));

      await expect(
        service.generateCode(queryRunner, ORG_A, MasterSequenceKey.MATERIAL_CATEGORY),
      ).rejects.toThrow('disk full');
    });
  });

  describe('withGeneratedCode', () => {
    it('hands the generated code to the callback and commits', async () => {
      queryRunner.manager.findOne.mockResolvedValue({ lastSequence: 41 });
      const work = jest.fn(async (code: string) => ({ code }));

      const result = await service.withGeneratedCode(
        ORG_A, MasterSequenceKey.MATERIAL_CATEGORY, work,
      );

      expect(work).toHaveBeenCalledWith('0042', queryRunner);
      expect(result).toEqual({ code: '0042' });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('rolls back when the callback throws, so the sequence is not consumed', async () => {
      queryRunner.manager.findOne.mockResolvedValue({ lastSequence: 0 });

      await expect(service.withGeneratedCode(
        ORG_A, MasterSequenceKey.MATERIAL_CATEGORY,
        async () => { throw new Error('insert failed'); },
      )).rejects.toThrow('insert failed');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('generates the code inside the same transaction as the insert', async () => {
      queryRunner.manager.findOne.mockResolvedValue({ lastSequence: 0 });

      await service.withGeneratedCode(ORG_A, MasterSequenceKey.MATERIAL_CATEGORY, async () => null);

      const order = [
        queryRunner.startTransaction.mock.invocationCallOrder[0],
        queryRunner.manager.findOne.mock.invocationCallOrder[0],
        queryRunner.commitTransaction.mock.invocationCallOrder[0],
      ];
      expect(order[0]).toBeLessThan(order[1]);
      expect(order[1]).toBeLessThan(order[2]);
    });
  });
});
