import 'dotenv/config';

export interface AppConfig {
  host: string;
  port: number;
  corsOrigin: string;
  weatherKitConfigured: boolean;
}

function readPort(value: string | undefined) {
  const port = Number(value ?? 3001);
  return Number.isInteger(port) && port > 0 ? port : 3001;
}

export function getConfig(): AppConfig {
  return {
    host: process.env.HOST ?? '127.0.0.1',
    port: readPort(process.env.PORT),
    corsOrigin: process.env.CORS_ORIGIN ?? 'https://calendar.ismyh.cn',
    weatherKitConfigured: Boolean(
      process.env.WEATHERKIT_TEAM_ID &&
        process.env.WEATHERKIT_KEY_ID &&
        process.env.WEATHERKIT_SERVICE_ID &&
        process.env.WEATHERKIT_PRIVATE_KEY,
    ),
  };
}
