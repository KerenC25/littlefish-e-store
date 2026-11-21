import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { normaliseCode } from './coupons';

/** Only the code is stored; its rules are looked up (and re-checked) whenever totals are derived. */
export interface CouponState {
  code: string | null;
}

export const initialCouponState: CouponState = { code: null };

const couponSlice = createSlice({
  name: 'coupon',
  initialState: initialCouponState,
  reducers: {
    couponApplied(state, action: PayloadAction<string>) {
      state.code = normaliseCode(action.payload);
    },
    couponRemoved(state) {
      state.code = null;
    },
  },
});

export const { couponApplied, couponRemoved } = couponSlice.actions;
export const couponActions = couponSlice.actions;
export const couponReducer = couponSlice.reducer;

export const selectCouponCode = (state: { coupon: CouponState }) => state.coupon.code;
