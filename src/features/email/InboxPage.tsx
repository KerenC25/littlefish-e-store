import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { brand as tokens } from '../../app/theme';
import { StatusMessage } from '../../shared/components/StatusMessage';
import { visuallyHidden } from '../../shared/styles/visuallyHidden';
import { emailRead, inboxCleared, selectInbox } from './outboxSlice';

const dateTime = new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Demo mailbox: shows exactly what the app "sent". Bodies are plain text rendered as text
 * (never as HTML), so message content cannot inject markup or script.
 */
export const InboxPage = () => {
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectInbox);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = messages.find((m) => m.id === selectedId) ?? messages[0];

  // Opening a message marks it read.
  useEffect(() => {
    if (selected && !selected.read) dispatch(emailRead(selected.id));
  }, [dispatch, selected]);

  return (
    <Box component="section" aria-labelledby="inbox-heading">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography id="inbox-heading" variant="h4" component="h1">
            Demo inbox
          </Typography>
          <Typography color="text.secondary">Every email the shop sends lands here, so you can see exactly what customers get.</Typography>
        </Box>
        {messages.length > 0 && (
          <Button color="inherit" onClick={() => dispatch(inboxCleared())}>
            Clear inbox
          </Button>
        )}
      </Box>

      <Alert severity="info" role="note" sx={{ mb: 3 }}>
        This static demo has no mail server. Emails go through an <code>EmailTransport</code> interface; in production that
        would call our backend, which holds the provider&apos;s secret key.
      </Alert>

      {messages.length === 0 ? (
        <StatusMessage
          illustration="📭"
          title="No mail yet"
          description="Place an order or join the newsletter, and the confirmation will swim in here."
        />
      ) : (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, alignItems: 'start' }}>
          <Paper component="nav" aria-label="Messages" sx={{ p: 1 }}>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {messages.map((m) => {
                const active = m.id === selected?.id;
                return (
                  <li key={m.id}>
                    <ButtonBase
                      onClick={() => setSelectedId(m.id)}
                      aria-current={active ? 'true' : undefined}
                      sx={{
                        width: '100%',
                        display: 'block',
                        textAlign: 'left',
                        p: 1.5,
                        borderRadius: '12px',
                        bgcolor: active ? tokens.mintWash : 'transparent',
                        '&:hover': { bgcolor: tokens.mintWash },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Typography component="span" fontWeight={m.read ? 600 : 800} noWrap>
                          {!m.read && (
                            <Box component="span" sx={{ color: tokens.tealDeep }}>
                              <span aria-hidden>● </span>
                              <Box component="span" sx={visuallyHidden}>
                                Unread:{' '}
                              </Box>
                            </Box>
                          )}
                          {m.subject}
                        </Typography>
                      </Box>
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }} noWrap>
                        {m.preview}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.secondary">
                        {dateTime.format(new Date(m.sentAt))}
                      </Typography>
                    </ButtonBase>
                  </li>
                );
              })}
            </Box>
          </Paper>

          {selected && (
            <Paper component="article" aria-labelledby="message-subject" sx={{ p: { xs: 2.5, md: 4 } }}>
              <Typography id="message-subject" variant="h5" component="h2" sx={{ mb: 1 }}>
                {selected.subject}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                From Little Fish Market &lt;hello@littlefish.market&gt; · To {selected.to} · {dateTime.format(new Date(selected.sentAt))}
              </Typography>
              <Typography
                component="div"
                sx={{ whiteSpace: 'pre-wrap', fontFamily: '"Inter", system-ui, sans-serif', lineHeight: 1.7, overflowWrap: 'anywhere' }}
              >
                {selected.body}
              </Typography>
              {selected.action && (
                <Button component={RouterLink} to={selected.action.path} variant="contained" color="secondary" sx={{ mt: 3 }}>
                  {selected.action.label}
                </Button>
              )}
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default InboxPage;
