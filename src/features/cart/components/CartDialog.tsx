import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Slide from '@mui/material/Slide';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import { forwardRef, type ReactElement, type Ref } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { StatusMessage } from '../../../shared/components/StatusMessage';
import { cartAdapter, cartCleared } from '../cartSlice';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';

const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const { selectIds } = cartAdapter.getSelectors();

interface CartDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * MUI Dialog gives us the hard accessibility parts: role="dialog", aria-modal, a focus
 * trap, Escape to close, and focus returned to the cart button on close.
 */
export const CartDialog = ({ open, onClose }: CartDialogProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const ids = useAppSelector((state) => selectIds(state.cart));

  const goToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <Dialog
      id="cart-dialog"
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
      TransitionComponent={SlideUp}
      aria-labelledby="cart-dialog-title"
    >
      <DialogTitle id="cart-dialog-title" sx={{ pr: 7, fontWeight: 800 }}>
        Your cart
      </DialogTitle>
      <IconButton onClick={onClose} aria-label="Close cart" sx={{ position: 'absolute', right: 12, top: 12 }}>
        <CloseIcon aria-hidden />
      </IconButton>

      <DialogContent dividers>
        {ids.length === 0 ? (
          <StatusMessage
            illustration="🛒"
            title="Your net is empty!"
            description="Have a browse. We will keep your picks safe, even if you close the tab."
            actionLabel="Start fishing"
            // Always lands on the shop, whichever page the cart was opened from.
            onAction={() => {
              onClose();
              navigate('/');
            }}
          />
        ) : (
          <>
            <Box component="ul" aria-label="Items in your cart" sx={{ listStyle: 'none', p: 0, m: 0, mb: 3 }}>
              {ids.map((id) => (
                <CartLineItem key={id} productId={id} />
              ))}
            </Box>
            <CartSummary />
          </>
        )}
      </DialogContent>

      {ids.length > 0 && (
        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button color="inherit" onClick={() => dispatch(cartCleared())}>
            Empty cart
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose}>Keep shopping</Button>
          <Button variant="contained" onClick={goToCheckout}>
            Checkout
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
