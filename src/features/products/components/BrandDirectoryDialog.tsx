import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { brand as tokens } from '../../../app/theme';
import { groupBrandsByLetter, type Brand } from '../brands';

interface BrandDirectoryDialogProps {
  open: boolean;
  brands: Brand[];
  activeBrand: string | null;
  onClose: () => void;
  onSelect: (name: string) => void;
}

/** A–Z brand index, in the style of the "all brands" pages on Superbalist and Takealot. */
export const BrandDirectoryDialog = ({ open, brands, activeBrand, onClose, onSelect }: BrandDirectoryDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupBrandsByLetter(q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands);
  }, [brands, query]);
  const matches = groups.reduce((n, [, list]) => n + list.length, 0);

  const jumpTo = (letter: string) =>
    document.getElementById(`brand-letter-${letter}`)?.scrollIntoView?.({ block: 'start' });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="brand-directory-title"
      TransitionProps={{ onExited: () => setQuery('') }}
    >
      <DialogTitle id="brand-directory-title" sx={{ pr: 7, fontWeight: 800, fontSize: '1.5rem' }}>
        All brands, A to Z
      </DialogTitle>
      <IconButton onClick={onClose} aria-label="Close brands" sx={{ position: 'absolute', right: 12, top: 12 }}>
        <CloseIcon aria-hidden />
      </IconButton>

      <Box sx={{ px: 3, pb: 2, display: 'grid', gap: 2 }}>
        <TextField
          label="Find a brand"
          type="search"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 40))}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon aria-hidden />
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {matches === 0 ? 'No brands match that. Try a shorter name.' : `${matches} ${matches === 1 ? 'brand' : 'brands'}`}
        </Typography>
        {groups.length > 1 && (
          <Box component="nav" aria-label="Jump to letter" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {groups.map(([letter]) => (
              <ButtonBase
                key={letter}
                onClick={() => jumpTo(letter)}
                aria-label={`Jump to ${letter === '#' ? 'other' : letter}`}
                sx={{ width: 32, height: 32, borderRadius: '8px', fontWeight: 700, '&:hover': { bgcolor: tokens.mintWash } }}
              >
                {letter}
              </ButtonBase>
            ))}
          </Box>
        )}
      </Box>

      <DialogContent dividers sx={{ pt: 1 }}>
        {groups.map(([letter, list]) => (
          <Box component="section" key={letter} aria-labelledby={`brand-letter-${letter}`} sx={{ mb: 3, scrollMarginTop: 8 }}>
            <Typography
              id={`brand-letter-${letter}`}
              component="h3"
              sx={{ fontSize: 28, fontWeight: 800, color: tokens.teal, mb: 1, scrollMarginTop: 8 }}
            >
              {letter}
            </Typography>
            <Box
              component="ul"
              sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 0.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}
            >
              {list.map((b) => {
                const active = b.name === activeBrand;
                return (
                  <li key={b.name}>
                    <ButtonBase
                      onClick={() => onSelect(b.name)}
                      aria-pressed={active}
                      sx={{
                        width: '100%',
                        justifyContent: 'space-between',
                        gap: 1,
                        px: 1.5,
                        py: 1,
                        borderRadius: '10px',
                        textAlign: 'left',
                        fontWeight: active ? 800 : 500,
                        bgcolor: active ? tokens.mintWash : 'transparent',
                        '&:hover': { bgcolor: tokens.mintWash },
                      }}
                    >
                      <span>{b.name}</span>
                      <Typography component="span" variant="body2" color="text.secondary">
                        {b.productCount}
                      </Typography>
                    </ButtonBase>
                  </li>
                );
              })}
            </Box>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};
