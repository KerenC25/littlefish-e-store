import { forwardRef } from 'react';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { useAppSelector } from '../../../app/hooks';
import { selectCartCount } from '../cartSlice';

interface CartButtonProps {
  onClick: () => void;
  expanded: boolean;
}

export const CartButton = forwardRef<HTMLButtonElement, CartButtonProps>(function CartButton(
  { onClick, expanded },
  ref,
) {
  const count = useAppSelector(selectCartCount);
  const label = count === 0 ? 'Cart, empty' : `Cart, ${count} ${count === 1 ? 'item' : 'items'}`;

  return (
    <Tooltip title="Your cart">
      <IconButton
        ref={ref}
        color="inherit"
        onClick={onClick}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={expanded ? 'cart-dialog' : undefined}
      >
        <Badge
          badgeContent={count}
          color="secondary"
          max={99}
          // The count is already in the button's accessible name.
          slotProps={{ badge: { 'aria-hidden': true } as Record<string, unknown> }}
          sx={{
            '& .MuiBadge-badge': {
              fontWeight: 700,
              transition: 'transform 200ms',
            },
          }}
        >
          <ShoppingBagOutlinedIcon aria-hidden />
        </Badge>
      </IconButton>
    </Tooltip>
  );
});
