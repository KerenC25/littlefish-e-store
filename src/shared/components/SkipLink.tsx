import { styled } from '@mui/material/styles';
import { brand } from '../../app/theme';

/** WCAG 2.4.1 (Bypass Blocks): first focusable element, visible only when focused. */
const Link = styled('a')(({ theme }) => ({
  position: 'absolute',
  left: theme.spacing(2),
  top: theme.spacing(-10),
  zIndex: theme.zIndex.tooltip + 1,
  padding: theme.spacing(1.5, 2.5),
  borderRadius: 999,
  background: brand.amber,
  color: brand.onAmber,
  fontWeight: 700,
  textDecoration: 'none',
  transition: theme.transitions.create('top'),
  '&:focus': { top: theme.spacing(2), outline: `3px solid ${brand.ink}`, outlineOffset: 2 },
}));

export const SkipLink = ({ targetId = 'main-content' }: { targetId?: string }) => (
  <Link href={`#${targetId}`}>Skip to main content</Link>
);
