import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClinicContext } from '../context/clinic-context.provider';

@Injectable()
export class ClinicContextMiddleware implements NestMiddleware {
  constructor(private readonly clinicContext: ClinicContext) {}

  use(req: Request, res: Response, next: NextFunction) {
    const practiceGuid = req.params.practiceGuid || req.query.practiceGuid || req.headers['x-clinic-id'];

    if (!practiceGuid) {
      throw new Error('clinicId is required');
    }

    this.clinicContext.setPracticeGuid(practiceGuid.toString());

    next();
  }
}