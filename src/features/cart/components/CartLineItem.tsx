import { memo } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RemoveIcon from '@mui/icons-material/Remove';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { formatZar } from '../../../shared/utils/money';
import { itemRemoved, quantityChanged, selectCartItemById } from '../cartSlice';

/** Takes only an id and selects its own entity: editing one line re-renders one line. */
export const CartLineItem = memo(function CartLineItem({ productId }: { productId: number }) {
  const dispatch = useAppDispatch();
  const item = useAppSelector((state) => selectCartItemById(state, productId));
  if (!item) return null;

  const setQuantity = (quantity: number) => dispatch(quantityChanged({ productId, quantity }));
  const titleId = `cart-line-${productId}`;

  return (
    <Box
      component="li"
      aria-labelledby={titleId}
      sx={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr auto',
        gridTemplateAreas: `"img title price" "img qty remove"`,
        columnGap: 2,
        rowGap: 1,
        alignItems: 'center',
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        component="img"
        src={item.thumbnail}
        alt=""
        width={64}
        height={64}
        sx={{ gridArea: 'img', objectFit: 'cover', borderRadius: 2, bgcolor: 'grey.100' }}
      />
      <Typography id={titleId} fontWeight={600} sx={{ gridArea: 'title' }}>
        {item.title}
      </Typography>
      <Typography fontWeight={700} sx={{ gridArea: 'price', textAlign: 'right' }}>
        {formatZar(item.unitPriceCents * item.quantity)}
      </Typography>

      <Box role="group" aria-label={`Quantity for ${item.title}`} sx={{ gridArea: 'qty', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => setQuantity(item.quantity - 1)}
          aria-label={item.quantity === 1 ? `Remove ${item.title}` : `Decrease quantity of ${item.title}`}
        >
          <RemoveIcon fontSize="small" aria-hidden />
        </IconButton>
        <Typography component="output" aria-live="polite" sx={{ minWidth: 24, textAlign: 'center' }}>
          {item.quantity}
        </Typography>
        <IconButton
          size="small"
          onClick={() => setQuantity(item.quantity + 1)}
          disabled={item.quantity >= item.maxQuantity}
          aria-label={`Increase quantity of ${item.title}`}
        >
          <AddIcon fontSize="small" aria-hidden />
        </IconButton>
      </Box>

      <IconButton
        onClick={() => dispatch(itemRemoved(productId))}
        aria-label={`Remove ${item.title} from cart`}
        sx={{ gridArea: 'remove', justifySelf: 'end' }}
        size="small"
      >
        <DeleteOutlineIcon fontSize="small" aria-hidden />
      </IconButton>
    </Box>
  );
});
