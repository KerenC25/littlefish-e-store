import { createContext, useContext, type ReactNode } from 'react';
import type { PaymentGateway } from './PaymentGateway';

/**
 * Dependency injection via Context: the app provides a gateway once at the root, tests
 * provide a fast fake, and no component imports a concrete implementation.
 */
const PaymentGatewayContext = createContext<PaymentGateway | null>(null);

export const PaymentGatewayProvider = ({
  gateway,
  children,
}: {
  gateway: PaymentGateway;
  children: ReactNode;
}) => <PaymentGatewayContext.Provider value={gateway}>{children}</PaymentGatewayContext.Provider>;

export const usePaymentGateway = (): PaymentGateway => {
  const gateway = useContext(PaymentGatewayContext);
  if (!gateway) throw new Error('usePaymentGateway must be used inside <PaymentGatewayProvider>');
  return gateway;
};
