import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { Repository } from 'typeorm';
import { Log } from './entity/log.entity';


const logFormat = winston.format.printf(({ timestamp, level, message, context }) => {
    return `${timestamp} [${context}] ${level}: ${message}`;
  });
  
  @Injectable()
  export class CustomLoggerService implements LoggerService {
    private readonly logger: winston.Logger;
  
    constructor(
      @InjectRepository(Log)
      private readonly logRepository: Repository<Log>,
    ) {
      this.logger = winston.createLogger({
        format: winston.format.combine(
          winston.format.timestamp(),
          logFormat,
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              logFormat,
            ),
          }),
          new winston.transports.DailyRotateFile({
            dirname: '/app/logs',
            filename: 'application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'debug',
          }),
          new winston.transports.DailyRotateFile({
            dirname: '/app/logs',
            filename: 'error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
          }),
        ],
      });
    }
  
    async logToDatabase(level: string, message: string, context?: string) {
      const log = new Log();
      log.level = level;
      log.message = message;
      log.context = context;
      await this.logRepository.save(log);
    }
  
    log(message: string, context?: string) {
      this.logger.info(message, { context });
      this.logToDatabase('info', message, context);
    }
  
    error(message: string, context?: any) {
      this.logger.error(message, { context });
      this.logToDatabase('error', message, context);
    }
  
    warn(message: string, context?: string) {
      this.logger.warn(message, { context });
      this.logToDatabase('warn', message, context);
    }
  
    debug(message: string, context?: string) {
      this.logger.debug(message, { context });
      this.logToDatabase('debug', message, context);
    }
  
    verbose(message: string, context?: string) {
      this.logger.verbose(message, { context });
      this.logToDatabase('verbose', message, context);
    }
  }