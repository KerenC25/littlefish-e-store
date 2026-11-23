import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useNotify } from '../../../shared/notifications/NotificationsContext';
import { selectCurrentUser } from '../authSlice';
import { signOut } from '../authThunks';

export const UserMenu = () => {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const notify = useNotify();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();

  if (!user) {
    return (
      <Button
        component={RouterLink}
        to="/login"
        color="inherit"
        variant="outlined"
        size="small"
        sx={{ borderColor: 'rgba(142, 227, 201, 0.5)', '&:hover': { borderColor: '#8EE3C9', bgcolor: 'rgba(142, 227, 201, 0.08)' } }}
      >
        Sign in
      </Button>
    );
  }

  return (
    <>
      <IconButton
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={`Account menu for ${user.firstName}`}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? menuId : undefined}
      >
        <Avatar src={user.image} alt="" sx={{ width: 32, height: 32 }}>
          {user.firstName.charAt(0)}
        </Avatar>
      </IconButton>
      <Menu id={menuId} anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        <MenuItem disabled>
          <ListItemText primary={`${user.firstName} ${user.lastName}`} secondary={user.email} />
        </MenuItem>
        <MenuItem component={RouterLink} to="/orders" onClick={() => setAnchor(null)}>
          My orders
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            void dispatch(signOut());
            notify('Signed out. Totsiens for now.', 'info');
          }}
        >
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
};
