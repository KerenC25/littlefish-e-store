import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { isValidEmail, normaliseEmail } from '../../shared/utils/validation';
import { NEWSLETTER_COUPON } from '../coupons/coupons';
import { sendEmail, type ThunkServices } from '../email/outboxSlice';
import { newsletterWelcomeEmail } from '../email/templates';

export interface Subscriber {
  email: string;
  /** ISO date-time consent was given: POPIA requires proof of opt-in. */
  consentedAt: string;
}

export interface NewsletterState {
  subscribers: Subscriber[];
}

export const initialNewsletterState: NewsletterState = { subscribers: [] };

const newsletterSlice = createSlice({
  name: 'newsletter',
  initialState: initialNewsletterState,
  reducers: {
    subscribed(state, action: PayloadAction<Subscriber>) {
      state.subscribers.push(action.payload);
    },
  },
});

export const { subscribed } = newsletterSlice.actions;
export const newsletterActions = newsletterSlice.actions;
export const newsletterReducer = newsletterSlice.reducer;

export interface SignupRequest {
  email: string;
  consent: boolean;
  /** Honeypot: a field hidden from people. Bots fill it in; humans never see it. */
  honeypot?: string;
}

export type SignupResult = 'subscribed' | 'already-subscribed';
export type SignupError = 'invalid-email' | 'no-consent' | 'failed';

export const SIGNUP_ERRORS: Record<SignupError, string> = {
  'invalid-email': 'That email does not look right. Try name@example.co.za.',
  'no-consent': 'Please tick the box so we know you are happy to hear from us.',
  failed: 'We could not sign you up just now. Please try again.',
};

export const subscribeToNewsletter = createAsyncThunk<
  SignupResult,
  SignupRequest,
  { state: { newsletter: NewsletterState }; extra: ThunkServices; rejectValue: SignupError }
>('newsletter/subscribe', async ({ email, consent, honeypot }, { getState, dispatch, extra, rejectWithValue }) => {
  // Pretend to succeed for bots, so they get no signal to adapt to.
  if (honeypot) return 'subscribed';
  if (!isValidEmail(email)) return rejectWithValue('invalid-email');
  if (!consent) return rejectWithValue('no-consent');

  const normalised = normaliseEmail(email);
  if (getState().newsletter.subscribers.some((s) => s.email === normalised)) return 'already-subscribed';

  try {
    await dispatch(sendEmail(newsletterWelcomeEmail(normalised, NEWSLETTER_COUPON, extra.appUrl))).unwrap();
  } catch {
    return rejectWithValue('failed');
  }
  dispatch(subscribed({ email: normalised, consentedAt: new Date().toISOString() }));
  return 'subscribed';
});

export const selectIsSubscribed = (state: { newsletter: NewsletterState }, email: string) =>
  state.newsletter.subscribers.some((s) => s.email === normaliseEmail(email));
