import { createAsyncThunk } from '@reduxjs/toolkit';
import { cartCleared } from '../cart/cartSlice';
import { couponRemoved } from '../coupons/couponSlice';
import { sendEmail, type ThunkServices } from '../email/outboxSlice';
import { orderConfirmationEmail } from '../email/templates';
import { orderPlaced } from './ordersSlice';
import type { Order } from './types';

export interface CompletedOrder {
  order: Order;
  /** False if the order went through but the confirmation email could not be sent. */
  emailSent: boolean;
}

/**
 * Everything that must happen once payment succeeds, in one place:
 * record the order, empty the cart, spend the coupon, and send the confirmation.
 * A failed email never undoes a paid order; the receipt says so instead.
 */
export const completeOrder = createAsyncThunk<CompletedOrder, Order, { extra: ThunkServices }>(
  'orders/complete',
  async (order, { dispatch, extra }) => {
    dispatch(orderPlaced(order));
    dispatch(cartCleared());
    dispatch(couponRemoved());
    try {
      await dispatch(sendEmail(orderConfirmationEmail(order, extra.appUrl))).unwrap();
      return { order, emailSent: true };
    } catch {
      return { order, emailSent: false };
    }
  },
);
