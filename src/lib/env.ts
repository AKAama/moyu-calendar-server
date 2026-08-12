import 'dotenv/config';
import { readFileSync } from 'node:fs';

export interface WeatherKitCreds {
  teamId: string;
  keyId: string;
  serviceId: string;
  privateKey: string;
}

export interface AppConfig {
  host: string;
  port: number;
  corsOrigin: string;
  weatherKitConfigured: boolean;
  weatherKit: WeatherKitCreds | null;
  databasePath: string;
  adminToken: string;
  contentReview: {
    enabled: string;
    deepseekApiKey: string;
    deepseekBaseUrl: string;
    deepseekModel: string;
  };
}

function readPort(value: string | undefined) {
  const port = Number(value ?? 3001);
  return Number.isInteger(port) && port > 0 ? port : 3001;
}

// WeatherKit 私钥可以是 .p8 文件内容，也可以是文件路径（更安全，不进仓库）。
// 含 PEM 头按内容处理，否则按路径读取。
function readPrivateKey(raw: string): string {
  if (raw.includes('BEGIN PRIVATE KEY')) return raw;
  return readFileSync(raw, 'utf8');
}

export function getConfig(): AppConfig {
  const teamId = process.env.WEATHERKIT_TEAM_ID;
  const keyId = process.env.WEATHERKIT_KEY_ID;
  const serviceId = process.env.WEATHERKIT_SERVICE_ID;
  const privateKeyRaw = process.env.WEATHERKIT_PRIVATE_KEY;

  const weatherKitConfigured = Boolean(
    teamId && keyId && serviceId && privateKeyRaw,
  );

  return {
    host: process.env.HOST ?? '127.0.0.1',
    port: readPort(process.env.PORT),
    corsOrigin: process.env.CORS_ORIGIN ?? 'https://calendar.ismyh.cn',
    databasePath: process.env.DATABASE_PATH ?? 'data/moyu-calendar.sqlite',
    adminToken: process.env.ADMIN_TOKEN ?? '',
    contentReview: {
      enabled: process.env.CONTENT_REVIEW_ENABLED ?? 'false',
      deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
      deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
      deepseekModel: process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash',
    },
    weatherKitConfigured,
    weatherKit: weatherKitConfigured
      ? {
          teamId: teamId as string,
          keyId: keyId as string,
          serviceId: serviceId as string,
          privateKey: readPrivateKey(privateKeyRaw as string),
        }
      : null,
  };
}
