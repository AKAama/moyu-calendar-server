import { createSign } from 'node:crypto';
import type { WeatherKitCreds } from './env.js';

const WEATHERKIT_ENDPOINT = 'https://weatherkit.apple.com/api/v1/weather';
const TOKEN_TTL_SECONDS = 60 * 60; // 1 小时

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

// 用 ES256 + .p8 私钥签 WeatherKit REST API 的 JWT。
// header: { alg, kid, typ, id: "TEAM_ID.SERVICE_ID" }
// payload: { sub: SERVICE_ID, iss: TEAM_ID, iat, exp, aud }
export function signJwt(creds: WeatherKitCreds, now: number): string {
  const header = {
    alg: 'ES256',
    kid: creds.keyId,
    typ: 'JWT',
    id: `${creds.teamId}.${creds.serviceId}`,
  };
  const payload = {
    sub: creds.serviceId,
    iss: creds.teamId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    aud: 'https://apple.com',
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  // ES256 JWT 要求 raw R‖S（IEEE P1363），Node 默认输出 DER，必须显式指定。
  const signature = signer.sign({ key: creds.privateKey, dsaEncoding: 'ieee-p1363' });

  return `${signingInput}.${base64url(signature)}`;
}

export interface WeatherKitResponse {
  currentWeather?: {
    temperature: number;
    temperatureApparent?: number;
    conditionCode?: string;
    humidity?: number;
    windSpeed?: number;
    windDirection?: number;
    uvIndex?: number;
    asOf?: string;
  };
  [key: string]: unknown;
}

export async function fetchWeatherKit(
  creds: WeatherKitCreds,
  lat: number,
  lon: number,
): Promise<WeatherKitResponse> {
  const token = signJwt(creds, Math.floor(Date.now() / 1000));
  const url = `${WEATHERKIT_ENDPOINT}/zh-CN/${lat}/${lon}?dataSets=currentWeather`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new UpstreamError(response.status, body || response.statusText);
  }

  return (await response.json()) as WeatherKitResponse;
}

export class UpstreamError extends Error {
  constructor(
    public readonly upstreamStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}
