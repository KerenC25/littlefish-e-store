import { memo, useCallback } from 'react';
import Button, { type ButtonProps } from '@mui/material/Button';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useNotify } from '../../../shared/notifications/NotificationsContext';
import type { Product } from '../../products/types';
import { itemAdded, selectQuantityInCart } from '../cartSlice';

interface AddToCartButtonProps {
  product: Product;
  quantity?: number;
  size?: ButtonProps['size'];
  fullWidth?: boolean;
}

/**
 * Subscribes to *this product's* cart quantity only, so adding one item re-renders one
 * button rather than the whole grid.
 */
export const AddToCartButton = memo(function AddToCartButton({
  product,
  quantity = 1,
  size = 'medium',
  fullWidth,
}: AddToCartButtonProps) {
  const dispatch = useAppDispatch();
  const notify = useNotify();
  const inCart = useAppSelector((state) => selectQuantityInCart(state, product.id));
  const soldOut = product.stock <= 0;
  const atLimit = inCart >= Math.max(1, product.stock);

  const handleClick = useCallback(() => {
    dispatch(itemAdded({ product, quantity }));
    notify(`Lekker. ${product.title} is swimming to your cart.`);
  }, [dispatch, notify, product, quantity]);

  const label = soldOut ? 'Sold out' : atLimit ? 'All stock in cart' : inCart > 0 ? `Add another (${inCart} in cart)` : 'Add to cart';

  return (
    <Button
      variant={inCart > 0 ? 'outlined' : 'contained'}
      size={size}
      fullWidth={fullWidth}
      startIcon={<AddShoppingCartIcon aria-hidden />}
      onClick={handleClick}
      disabled={soldOut || atLimit}
      // Visible text is generic ("Add to cart"); the accessible name says *which* product.
      aria-label={soldOut || atLimit ? `${product.title}: ${label}` : `Add ${product.title} to cart`}
    >
      {label}
    </Button>
  );
});
