import { registerAs } from '@nestjs/config';
import { join } from 'path';
import { DatabaseConfig } from './types/database.config';

export const getDatabaseConfig = registerAs('database', (): DatabaseConfig => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  logger: 'advanced-console',
  migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
  autoLoadEntities: false,

  
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN,
}));

export const adminConfig = registerAs('admin', () => ({
  email: process.env.ADMIN_EMAIL,
}));

export const smtpConfig = registerAs('smtp', () => ({
    simpleHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpSecure: process.env.SMTP_SECURE,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,
  }));


export const googleCloudConfig = registerAs('googleCloud', () => ({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  clientEmail: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_CLOUD_PRIVATE_KEY,
  bucketName: process.env.GOOGLE_CLOUD_BUCKET,
}));