export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  logger: string;
  migrationsRun?: boolean;
  migrations?: string[];
  autoLoadEntities: boolean;
  migrationsTableName?: string;
}