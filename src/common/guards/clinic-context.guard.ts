import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ClinicContext } from "../context/clinic-context.provider";

@Injectable()
export class ClinicContextGuard implements CanActivate {
  constructor(private readonly clinicContext: ClinicContext) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    this.clinicContext.setPracticeGuid(req.params.practiceGuid || req.query.practiceGuid || req.headers['x-clinic-id'].toString());
    return true;
  }
}