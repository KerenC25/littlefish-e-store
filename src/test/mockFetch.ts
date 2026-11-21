/**
 * Minimal fetch router for tests. Each handler receives the parsed request and returns a
 * JSON body (status 200) or `{ status, body }`. Unmatched requests fail loudly.
 */
export interface MockRequest {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
}

type HandlerResult = unknown | { status: number; body: unknown };
export type Handler = (req: MockRequest) => HandlerResult | undefined | Promise<HandlerResult | undefined>;

const isStatusResult = (r: unknown): r is { status: number; body: unknown } =>
  typeof r === 'object' && r !== null && 'status' in r && 'body' in r && typeof (r as { status: unknown }).status === 'number';

export const mockFetch = (...handlers: Handler[]) => {
  const calls: MockRequest[] = [];
  const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const text = await request.text();
    const req: MockRequest = {
      method: request.method,
      url: new URL(request.url),
      headers: request.headers,
      body: text ? JSON.parse(text) : undefined,
    };
    calls.push(req);
    for (const handler of handlers) {
      const result = await handler(req);
      if (result === undefined) continue;
      const { status, body } = isStatusResult(result) ? result : { status: 200, body: result };
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error(`Unhandled request: ${req.method} ${req.url.pathname}${req.url.search}`);
  });
  return { spy, calls };
};

/** Matches method + pathname; returns `respond(req)` when matched. */
export const on =
  (method: string, pathname: string, respond: (req: MockRequest) => HandlerResult): Handler =>
  (req) =>
    req.method === method && req.url.pathname === pathname ? respond(req) : undefined;
