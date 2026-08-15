import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { MaterialCodeCounter } from './entities/material-code-counter.entity';

@Injectable()
export class MaterialCodeService {
  private readonly logger = new Logger(MaterialCodeService.name);

  constructor(
    @InjectRepository(MaterialCodeCounter)
    private readonly counterRepo: Repository<MaterialCodeCounter>,
  ) {}

  // Derive a 3-char uppercase alphabetic prefix from a category name.
  // Strips all non-alpha chars, uppercases, and takes the first 3.
  // e.g. "Raw Material" → "RAW", "Consumable" → "CON", "Spare Part" → "SPA"
  deriveCategoryPrefix(categoryName: string): string {
    const alpha = categoryName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    return alpha.substring(0, 3).padEnd(3, 'X'); // 'X' fallback if name is very short
  }

  // Generate the next material code within an open queryRunner transaction.
  // Uses pessimistic row-level locking to prevent duplicate codes under
  // concurrent inserts.  Must be called INSIDE an active transaction.
  async generateCode(
    queryRunner: QueryRunner,
    organizationId: string,
    categoryPrefix: string,
  ): Promise<string> {
    // Try to find existing counter row (with FOR UPDATE lock)
    let counter = await queryRunner.manager.findOne(MaterialCodeCounter, {
      where: { organizationId, categoryPrefix },
      lock: { mode: 'pessimistic_write' },
    });

    if (!counter) {
      // First material with this prefix — insert the counter row.
      // Race condition: two concurrent first-time inserts may both find null and
      // both attempt to insert.  Catch the unique-constraint error and re-read.
      try {
        counter = queryRunner.manager.create(MaterialCodeCounter, {
          organizationId,
          categoryPrefix,
          lastSequence: 0,
        });
        await queryRunner.manager.save(MaterialCodeCounter, counter);
        // Re-lock the row we just inserted
        counter = await queryRunner.manager.findOne(MaterialCodeCounter, {
          where: { organizationId, categoryPrefix },
          lock: { mode: 'pessimistic_write' },
        });
      } catch (err) {
        // Unique constraint violation (ER_DUP_ENTRY) — another transaction won; re-read
        if (err?.code === 'ER_DUP_ENTRY') {
          counter = await queryRunner.manager.findOne(MaterialCodeCounter, {
            where: { organizationId, categoryPrefix },
            lock: { mode: 'pessimistic_write' },
          });
        } else {
          throw err;
        }
      }
    }

    counter.lastSequence = Number(counter.lastSequence) + 1;
    await queryRunner.manager.save(MaterialCodeCounter, counter);

    // Format: <3-char prefix><6-digit zero-padded sequence>
    const seq = String(counter.lastSequence).padStart(6, '0');
    return `${categoryPrefix}${seq}`;
  }
}
