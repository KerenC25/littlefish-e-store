import { makeStore } from '../../app/store';
import { STORAGE_KEYS } from '../../shared/config';
import { createMemoryStorage } from '../../test/memoryStorage';
import { emailDelivered, selectInbox, selectUnreadCount, sendEmail } from '../email/outboxSlice';
import { subscribeToNewsletter } from './newsletterSlice';

const setup = (send: () => Promise<void> = async () => undefined) => {
  const durableStorage = createMemoryStorage();
  const store = makeStore({
    durableStorage,
    authStorage: createMemoryStorage(),
    emailTransport: { send: jest.fn(send) },
    appUrl: 'https://shop.example.test/',
  });
  return { store, durableStorage };
};

describe('subscribeToNewsletter', () => {
  it('subscribes, records consent time, and sends a welcome email with the coupon', async () => {
    const { store, durableStorage } = setup();
    const result = await store.dispatch(subscribeToNewsletter({ email: '  Sipho@Example.TEST ', consent: true }));

    expect(result.payload).toBe('subscribed');
    expect(store.getState().newsletter.subscribers).toEqual([{ email: 'sipho@example.test', consentedAt: expect.any(String) }]);
    const [welcome] = selectInbox(store.getState());
    expect(welcome).toMatchObject({ kind: 'newsletter-welcome', to: 'sipho@example.test', read: false });
    expect(welcome?.body).toContain('SHOAL15');
    expect(JSON.parse(durableStorage.getItem(STORAGE_KEYS.newsletter) ?? '{}').data).toHaveLength(1);
  });

  it.each([
    ['invalid-email', { email: 'not-an-email', consent: true }],
    ['no-consent', { email: 'sipho@example.test', consent: false }],
  ])('rejects with %s', async (error, request) => {
    const { store } = setup();
    const result = await store.dispatch(subscribeToNewsletter(request));
    expect(result.payload).toBe(error);
    expect(store.getState().newsletter.subscribers).toEqual([]);
  });

  it('does not subscribe twice or re-send the welcome email', async () => {
    const { store } = setup();
    await store.dispatch(subscribeToNewsletter({ email: 'sipho@example.test', consent: true }));
    const again = await store.dispatch(subscribeToNewsletter({ email: 'SIPHO@example.test', consent: true }));
    expect(again.payload).toBe('already-subscribed');
    expect(store.getState().newsletter.subscribers).toHaveLength(1);
    expect(selectInbox(store.getState())).toHaveLength(1);
  });

  it('silently ignores bots that fill in the honeypot', async () => {
    const { store } = setup();
    const result = await store.dispatch(subscribeToNewsletter({ email: 'bot@spam.test', consent: true, honeypot: 'ACME' }));
    expect(result.payload).toBe('subscribed'); // looks like success to the bot
    expect(store.getState().newsletter.subscribers).toEqual([]);
    expect(selectInbox(store.getState())).toEqual([]);
  });

  it('does not subscribe if the welcome email cannot be sent', async () => {
    const { store } = setup(async () => {
      throw new Error('SMTP down');
    });
    const result = await store.dispatch(subscribeToNewsletter({ email: 'sipho@example.test', consent: true }));
    expect(result.payload).toBe('failed');
    expect(store.getState().newsletter.subscribers).toEqual([]);
  });
});

describe('outbox', () => {
  it('sends through the injected transport, then counts unread mail', async () => {
    const send = jest.fn(async () => undefined);
    const store = makeStore({ durableStorage: createMemoryStorage(), authStorage: createMemoryStorage(), emailTransport: { send } });
    await store.dispatch(sendEmail({ kind: 'newsletter-welcome', to: 'a@b.test', subject: 'Hi', preview: '', body: 'Hello' }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.test', id: expect.stringMatching(/^msg_/) }));
    expect(selectUnreadCount(store.getState())).toBe(1);
  });

  it('drops stored messages whose action links off-site', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEYS.outbox]: JSON.stringify({
        version: 1,
        data: [{ id: 'msg_1', kind: 'newsletter-welcome', to: 'a@b.test', subject: 'x', preview: '', body: '', sentAt: '2026-01-01T00:00:00Z', read: false, action: { label: 'Win!', path: '//evil.test' } }],
      }),
    });
    const store = makeStore({ durableStorage: storage, authStorage: createMemoryStorage() });
    expect(selectInbox(store.getState())).toEqual([]);
    // Valid messages still load.
    store.dispatch(emailDelivered({ id: 'msg_2', kind: 'newsletter-welcome', to: 'a@b.test', subject: 'ok', preview: '', body: '', sentAt: '2026-01-01T00:00:00Z', read: false }));
    expect(selectInbox(makeStore({ durableStorage: storage, authStorage: createMemoryStorage() }).getState())).toHaveLength(1);
  });
});
