/** Random hex id with a readable prefix, e.g. `msg_3f9a…`. Uses the Web Crypto API. */
export const randomId = (prefix: string, bytes = 8): string => {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  return `${prefix}_${Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('')}`;
};
