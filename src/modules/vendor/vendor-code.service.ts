import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { VendorCodeCounter } from './entities/vendor-code-counter.entity';

// Vendor code generation. Deliberately identical in shape to
// MaterialCodeService so both masters behave the same under concurrency.
@Injectable()
export class VendorCodeService {
  private readonly logger = new Logger(VendorCodeService.name);

  constructor(
    @InjectRepository(VendorCodeCounter)
    private readonly counterRepo: Repository<VendorCodeCounter>,
  ) {}

  // Derive a 3-char uppercase alphabetic prefix from an Industry Category name.
  // Strips all non-alpha chars, uppercases, and takes the first 3.
  // e.g. "Civil" → "CIV", "Mechanical" → "MEC", "Instrumentation" → "INS"
  //
  // The category name is master data supplied by the administrator — no
  // category value is hard-coded anywhere in this module.
  deriveCategoryPrefix(categoryName: string): string {
    const alpha = categoryName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    return alpha.substring(0, 3).padEnd(3, 'X'); // 'X' fallback if name is very short
  }

  // Generate the next vendor code within an open queryRunner transaction.
  // Uses pessimistic row-level locking (SELECT ... FOR UPDATE) to prevent
  // duplicate codes under concurrent inserts. Must be called INSIDE an active
  // transaction.
  //
  // Explicitly NOT implemented as SELECT MAX(code) + 1: that read is not
  // serialised against a concurrent insert, so two simultaneous creates would
  // both read the same maximum and both emit e.g. CIV000101.
  async generateCode(
    queryRunner: QueryRunner,
    organizationId: string,
    categoryPrefix: string,
  ): Promise<string> {
    // Try to find existing counter row (with FOR UPDATE lock)
    let counter = await queryRunner.manager.findOne(VendorCodeCounter, {
      where: { organizationId, categoryPrefix },
      lock: { mode: 'pessimistic_write' },
    });

    if (!counter) {
      // First vendor with this prefix — insert the counter row.
      // Race condition: two concurrent first-time inserts may both find null and
      // both attempt to insert. Catch the unique-constraint error and re-read.
      try {
        counter = queryRunner.manager.create(VendorCodeCounter, {
          organizationId,
          categoryPrefix,
          lastSequence: 0,
        });
        await queryRunner.manager.save(VendorCodeCounter, counter);
        // Re-lock the row we just inserted
        counter = await queryRunner.manager.findOne(VendorCodeCounter, {
          where: { organizationId, categoryPrefix },
          lock: { mode: 'pessimistic_write' },
        });
      } catch (err) {
        const error = err as { code?: string };
        // Unique constraint violation (ER_DUP_ENTRY) — another transaction won; re-read
        if (error.code === 'ER_DUP_ENTRY') {
          counter = await queryRunner.manager.findOne(VendorCodeCounter, {
            where: { organizationId, categoryPrefix },
            lock: { mode: 'pessimistic_write' },
          });
        } else {
          throw err;
        }
      }
    }

    counter.lastSequence = Number(counter.lastSequence) + 1;
    await queryRunner.manager.save(VendorCodeCounter, counter);

    // Format: <3-char prefix><6-digit zero-padded sequence>
    const seq = String(counter.lastSequence).padStart(6, '0');
    return `${categoryPrefix}${seq}`;
  }
}
