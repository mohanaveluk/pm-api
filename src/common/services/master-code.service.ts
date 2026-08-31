import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { MasterCodeCounter } from '../entities/master-code-counter.entity';

// Sequence keys for the masters that use a plain incrementing code.
// Adding a master means adding a key here — no new table, no new service.
export enum MasterSequenceKey {
  MATERIAL_CATEGORY   = 'MATERIAL_CATEGORY',
  MATERIAL_GROUP      = 'MATERIAL_GROUP',
  UNIT_OF_MEASUREMENT = 'UNIT_OF_MEASUREMENT',
  INDUSTRY_CATEGORY   = 'INDUSTRY_CATEGORY',
  DEPARTMENT          = 'DEPARTMENT',
  DISCIPLINE          = 'DISCIPLINE',
  ACTIVITY            = 'ACTIVITY',
  VENDOR_TYPE         = 'VENDOR_TYPE',
}

// Codes are zero-padded to this width: 0001, 0002, … Sequences beyond 9999
// simply widen (10000) rather than wrapping or truncating.
const CODE_PAD_WIDTH = 4;

// Generates sequential, per-organization master codes.
//
// Same concurrency approach as MaterialCodeService and VendorCodeService: the
// counter row is taken with SELECT ... FOR UPDATE before it is incremented, so
// two simultaneous creates cannot be handed the same number.
//
// Explicitly NOT MAX(code) + 1 — that read is not serialised against a
// concurrent insert, so both callers would compute the same next value.
@Injectable()
export class MasterCodeService {
  private readonly logger = new Logger(MasterCodeService.name);

  constructor(
    @InjectRepository(MasterCodeCounter)
    private readonly counterRepo: Repository<MasterCodeCounter>,
    private readonly dataSource: DataSource,
  ) {}

  // Generates the next code inside an ALREADY OPEN transaction.
  async generateCode(
    queryRunner: QueryRunner,
    organizationId: string,
    sequenceKey: MasterSequenceKey,
  ): Promise<string> {
    let counter = await queryRunner.manager.findOne(MasterCodeCounter, {
      where: { organizationId, sequenceKey },
      lock: { mode: 'pessimistic_write' },
    });

    if (!counter) {
      // First code for this organization and master. Two concurrent
      // first-time creates can both find null and both try to insert; the
      // loser catches the unique-constraint violation and re-reads.
      try {
        counter = queryRunner.manager.create(MasterCodeCounter, {
          organizationId,
          sequenceKey,
          lastSequence: 0,
        });
        await queryRunner.manager.save(MasterCodeCounter, counter);
        counter = await queryRunner.manager.findOne(MasterCodeCounter, {
          where: { organizationId, sequenceKey },
          lock: { mode: 'pessimistic_write' },
        });
      } catch (err) {
        const error = err as { code?: string };
        if (error.code === 'ER_DUP_ENTRY') {
          counter = await queryRunner.manager.findOne(MasterCodeCounter, {
            where: { organizationId, sequenceKey },
            lock: { mode: 'pessimistic_write' },
          });
        } else {
          throw err;
        }
      }
    }

    counter.lastSequence = Number(counter.lastSequence) + 1;
    await queryRunner.manager.save(MasterCodeCounter, counter);

    return String(counter.lastSequence).padStart(CODE_PAD_WIDTH, '0');
  }

  // Convenience wrapper for services that have no transaction of their own:
  // opens one, runs `work` with the freshly generated code, and commits.
  // Keeping the code generation and the insert in the SAME transaction is what
  // makes the sequence gap-free when an insert fails.
  async withGeneratedCode<T>(
    organizationId: string,
    sequenceKey: MasterSequenceKey,
    work: (code: string, queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const code = await this.generateCode(queryRunner, organizationId, sequenceKey);
      const result = await work(code, queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
