import { EntityRepository, Repository } from 'typeorm';
import { Log } from './entity/log.entity';

@EntityRepository(Log)
export class LogRepository extends Repository<Log> {}