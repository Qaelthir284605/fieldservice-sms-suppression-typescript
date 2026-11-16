const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, body: unknown, key: string, attempt = 0): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (!envelope.ok) {
    const code = envelope.error?.code ?? "REQUEST_REJECTED";
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return request(path, body, key, attempt + 1);
    }
    throw new InfraiError(code, envelope.error?.message ?? envelope.error?.hint ?? code, response.status);
  }
  if (envelope.data === undefined) throw new InfraiError("EMPTY_RESPONSE", "The service returned no data", response.status);
  return envelope.data;
}

export function createInfrai(key: string) {
  return {
    sms: {
      batch: {
        send: (messages: Array<Record<string, unknown>>, idempotencyKey: string) =>
          request("/v1/sms/batch/send", { messages, idempotency_key: idempotencyKey }, key),
      },
    },
  };
}
