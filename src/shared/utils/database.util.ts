import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseUtil');

export async function waitForDatabase(config: TypeOrmModuleOptions | any): Promise<void> {
  const { host, port, username, password, database } = config;
  
  logger.log(`Waiting for database connection at ${host}:${port} - ${username}, ${password}, ${database}...`);
  
  let retries = 0;
  const maxRetries = 30;
  const delay = 1000;

  while (retries < maxRetries) {
    try {
      const socket = new (await import('net')).Socket();
      
      await new Promise<void>((resolve, reject) => {
        socket.connect(Number(port), String(host), () => {
          socket.end();
          resolve();
        });
        
        socket.on('error', (err) => {
          reject(err);
        });
      });
      
      logger.log('Database is available');
      return;
    } catch (err) {
      retries++;
      logger.warn(`Database connection attempt ${retries}/${maxRetries} failed`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unable to connect to database');
}