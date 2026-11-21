import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { useSearchAddressesQuery, type AddressSuggestion } from '../../../services/geocodingApi';

/** Searching before this many characters returns noise and wastes the free service. */
export const MIN_SEARCH_LENGTH = 4;

interface AddressAutocompleteProps {
  value: string;
  /** Free typing: the user can always enter an address the map does not know. */
  onChange: (street: string) => void;
  /** Picking a suggestion fills street, city, province and postal code in one go. */
  onSelect: (suggestion: AddressSuggestion) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export const AddressAutocomplete = ({ value, onChange, onSelect, error, helperText, disabled }: AddressAutocompleteProps) => {
  const term = useDebouncedValue(value.trim(), 350);
  const { data: suggestions = [], isFetching, isError } = useSearchAddressesQuery(term, {
    skip: term.length < MIN_SEARCH_LENGTH,
  });

  const tooShort = value.trim().length < MIN_SEARCH_LENGTH;

  return (
    <Autocomplete<AddressSuggestion, false, false, true>
      freeSolo
      disabled={disabled}
      options={tooShort ? [] : suggestions}
      // The geocoder already filtered; don't let MUI re-filter by the street text.
      filterOptions={(options) => options}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option.street)}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      inputValue={value}
      onInputChange={(_event, next, reason) => {
        if (reason === 'input' || reason === 'clear') onChange(next);
      }}
      onChange={(_event, picked) => {
        if (picked && typeof picked !== 'string') onSelect(picked);
      }}
      loading={isFetching}
      loadingText="Casting the net…"

      renderOption={({ key, ...props }, option) => (
        <Box component="li" key={key} {...props} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start !important' }}>
          <PlaceOutlinedIcon aria-hidden fontSize="small" sx={{ mt: 0.25, color: 'primary.main' }} />
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {option.street}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[option.city, option.province, option.postalCode].filter(Boolean).join(', ')}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          name="address"
          id="checkout-address"
          label="Street address"
          required
          autoComplete="street-address"
          error={error}
          // freeSolo hides the popup when there are no options, so status goes in the helper text.
          helperText={
            helperText ??
            (isError && !tooShort
              ? 'Address search is unavailable. Just type your address.'
              : 'Start typing and pick your address, or type it in full.')
          }
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching && <CircularProgress size={18} aria-label="Searching addresses" />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};
