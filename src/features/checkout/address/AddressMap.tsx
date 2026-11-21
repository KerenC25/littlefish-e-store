import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

interface AddressMapProps {
  lat: number;
  lon: number;
  label: string;
}

/** Builds an OpenStreetMap embed URL with a marker. Exported for unit tests. */
export const osmEmbedUrl = (lat: number, lon: number): string => {
  const dLon = 0.006;
  const dLat = 0.004;
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)},${lon.toFixed(5)}`;
};

/** A small map confirming the picked address. Free OpenStreetMap embed, no API key. */
export const AddressMap = ({ lat, lon, label }: AddressMapProps) => (
  <Box sx={{ borderRadius: '14px', overflow: 'hidden', border: 1, borderColor: 'divider', mb: 2 }}>
    <Box
      component="iframe"
      title={`Map showing ${label}`}
      src={osmEmbedUrl(lat, lon)}
      loading="lazy"
      referrerPolicy="no-referrer"
      sx={{ display: 'block', width: '100%', height: 180, border: 0 }}
    />
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, px: 1.5, py: 0.75, bgcolor: 'background.default' }}>
      <Typography variant="caption" color="text.secondary">
        Map and address data ©{' '}
        <Link href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </Link>{' '}
        contributors
      </Typography>
      <Link
        variant="caption"
        href={`https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lon.toFixed(5)}#map=17/${lat.toFixed(5)}/${lon.toFixed(5)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Bigger map
      </Link>
    </Box>
  </Box>
);
