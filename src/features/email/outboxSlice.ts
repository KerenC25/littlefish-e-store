import { createAsyncThunk, createEntityAdapter, createSlice, type EntityState, type PayloadAction } from '@reduxjs/toolkit';
import { randomId } from '../../shared/utils/ids';
import type { EmailDraft, EmailMessage, EmailTransport } from './types';

/** Services available to thunks, injected via Redux Toolkit's thunk `extraArgument`. */
export interface ThunkServices {
  emailTransport: EmailTransport;
  /** Absolute URL of the app root, for links inside emails. */
  appUrl: string;
}

export const outboxAdapter = createEntityAdapter({
  selectId: (m: EmailMessage) => m.id,
  sortComparer: (a: EmailMessage, b: EmailMessage) => b.sentAt.localeCompare(a.sentAt),
});

export type OutboxState = EntityState<EmailMessage, string>;
export const initialOutboxState: OutboxState = outboxAdapter.getInitialState();
export const MAX_STORED_EMAILS = 50;

const outboxSlice = createSlice({
  name: 'outbox',
  initialState: initialOutboxState,
  reducers: {
    emailDelivered(state, action: PayloadAction<EmailMessage>) {
      outboxAdapter.addOne(state, action.payload);
      const overflow = state.ids.slice(MAX_STORED_EMAILS);
      if (overflow.length > 0) outboxAdapter.removeMany(state, overflow);
    },
    emailRead(state, action: PayloadAction<string>) {
      outboxAdapter.updateOne(state, { id: action.payload, changes: { read: true } });
    },
    inboxCleared() {
      return initialOutboxState;
    },
  },
});

export const { emailDelivered, emailRead, inboxCleared } = outboxSlice.actions;
export const outboxActions = outboxSlice.actions;
export const outboxReducer = outboxSlice.reducer;

/**
 * Sends an email through the injected transport, then records it in the demo inbox.
 * Rejects (without recording) if the transport fails, so callers can decide what to do.
 */
export const sendEmail = createAsyncThunk<EmailMessage, EmailDraft, { extra: ThunkServices }>(
  'email/send',
  async (draft, { extra, dispatch }) => {
    const message: EmailMessage = { ...draft, id: randomId('msg'), sentAt: new Date().toISOString(), read: false };
    await extra.emailTransport.send(message);
    dispatch(emailDelivered(message));
    return message;
  },
);

/** Demo transport: "delivery" is recording the message in the in-app inbox. */
export const demoEmailTransport: EmailTransport = { send: async () => undefined };

type StateWithOutbox = { outbox: OutboxState };
const selectors = outboxAdapter.getSelectors<StateWithOutbox>((s) => s.outbox);
export const selectInbox = selectors.selectAll;
export const selectEmailById = selectors.selectById;
export const selectUnreadCount = (state: StateWithOutbox) =>
  state.outbox.ids.reduce((n, id) => (state.outbox.entities[id]?.read ? n : n + 1), 0);
