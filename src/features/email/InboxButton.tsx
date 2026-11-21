import { Link as RouterLink } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useAppSelector } from '../../app/hooks';
import { selectUnreadCount } from './outboxSlice';

export const InboxButton = () => {
  const unread = useAppSelector(selectUnreadCount);
  const label = unread === 0 ? 'Demo inbox' : `Demo inbox, ${unread} unread`;
  return (
    <Tooltip title="Demo inbox">
      <IconButton component={RouterLink} to="/inbox" color="inherit" aria-label={label}>
        <Badge
          badgeContent={unread}
          color="secondary"
          max={9}
          slotProps={{ badge: { 'aria-hidden': true } as Record<string, unknown> }}
        >
          <MailOutlineIcon aria-hidden />
        </Badge>
      </IconButton>
    </Tooltip>
  );
};
