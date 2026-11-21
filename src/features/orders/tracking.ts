/**
 * Order tracking timeline, derived purely from when the order was placed.
 *
 * There is no courier API behind this demo, so progress is simulated on a compressed clock
 * (minutes, not days) so a reviewer can watch an order move. A real implementation would
 * replace `trackOrder` with courier webhook events; the UI only depends on `TrackingView`.
 */
export type OrderStatus = 'placed' | 'packed' | 'out-for-delivery' | 'delivered';

interface Stage {
  status: OrderStatus;
  label: string;
  blurb: string;
  /** Minutes after the order was placed. */
  afterMinutes: number;
}

export const STAGES: readonly Stage[] = [
  { status: 'placed', label: 'Order placed', blurb: 'Payment received. Your order is in the net.', afterMinutes: 0 },
  { status: 'packed', label: 'Packed', blurb: 'Bubble-wrapped with love (and slightly too much tape).', afterMinutes: 2 },
  {
    status: 'out-for-delivery',
    label: 'Out for delivery',
    blurb: 'On the M1, dodging taxis like a pro.',
    afterMinutes: 10,
  },
  { status: 'delivered', label: 'Delivered', blurb: 'At your door. Enjoy, Jozi.', afterMinutes: 45 },
];

export interface TrackingStep extends Stage {
  at: Date;
  done: boolean;
  current: boolean;
}

export interface TrackingView {
  status: OrderStatus;
  label: string;
  steps: TrackingStep[];
  /** When the order is (or was) delivered. */
  deliveryAt: Date;
  /** 0..1, for a progress bar. */
  progress: number;
}

const MINUTE = 60_000;

export const trackOrder = (placedAt: Date | string, now: Date = new Date()): TrackingView => {
  const start = new Date(placedAt).getTime();
  const elapsedMinutes = Math.max(0, (now.getTime() - start) / MINUTE);

  let currentIndex = 0;
  STAGES.forEach((stage, i) => {
    if (elapsedMinutes >= stage.afterMinutes) currentIndex = i;
  });

  const steps = STAGES.map((stage, i) => ({
    ...stage,
    at: new Date(start + stage.afterMinutes * MINUTE),
    done: i <= currentIndex,
    current: i === currentIndex,
  }));
  const last = STAGES[STAGES.length - 1]!;
  const current = STAGES[currentIndex]!;

  return {
    status: current.status,
    label: current.label,
    steps,
    deliveryAt: new Date(start + last.afterMinutes * MINUTE),
    progress: Math.min(1, elapsedMinutes / last.afterMinutes),
  };
};
