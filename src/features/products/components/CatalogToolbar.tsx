import { memo, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { PAGE_SIZE_OPTIONS } from '../../../shared/config';
import {
  categoryChanged,
  filtersReset,
  pageSizeChanged,
  searchChanged,
  selectHasActiveFilters,
  sortChanged,
} from '../catalogSlice';
import { useGetCategoriesQuery } from '../productsApi';
import type { SortOption } from '../types';

export const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'rating-desc': 'Top rated',
  'title-asc': 'Name: A to Z',
};

const MAX_SEARCH_LENGTH = 80;
/** Sentinel for "no category": MUI Select renders nothing for an empty-string value. */
const ALL_CATEGORIES = '__all__';

export const CatalogToolbar = memo(function CatalogToolbar() {
  const dispatch = useAppDispatch();
  const { category, sort, pageSize, search } = useAppSelector((s) => s.catalog);
  const hasActiveFilters = useAppSelector(selectHasActiveFilters);
  const { data: categories = [], isError: categoriesFailed } = useGetCategoriesQuery();

  // Local state keeps typing snappy; Redux (and the network) only see the debounced value.
  const [term, setTerm] = useState(search);
  const debouncedTerm = useDebouncedValue(term, 400);

  useEffect(() => {
    if (debouncedTerm !== search) dispatch(searchChanged(debouncedTerm));
    // `search` intentionally omitted: we only react to the user's typing here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm, dispatch]);

  // Keep the input in sync when search is cleared elsewhere (category change, reset).
  useEffect(() => {
    setTerm((current) => (current.trim() === search ? current : search));
  }, [search]);

  return (
    <Box
      component="form"
      role="search"
      aria-label="Filter products"
      onSubmit={(e) => {
        e.preventDefault();
        dispatch(searchChanged(term));
      }}
      sx={{
        display: 'grid',
        gap: 2,
        // Search spans the full width on small screens, then shares a row with the selects.
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 0.7fr auto' },
        alignItems: 'center',
        mb: 3,
        p: { xs: 2, md: 2.5 },
        pb: { xs: 0.5, md: 1 },
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '20px',
      }}
    >
      <TextField
        label="Search products"
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value.slice(0, MAX_SEARCH_LENGTH))}
        size="small"
        sx={{ gridColumn: { sm: '1 / -1', md: 'auto' } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon aria-hidden />
              </InputAdornment>
            ),
          },
          htmlInput: { maxLength: MAX_SEARCH_LENGTH },
        }}
        // With an id, MUI links the helper text via aria-describedby automatically.
        id="product-search"
        helperText="Searching clears the category filter."
      />

      <FormControl size="small" sx={{ alignSelf: 'start' }}>
        <InputLabel id="category-label">Category</InputLabel>
        <Select
          labelId="category-label"
          label="Category"
          value={category ?? ALL_CATEGORIES}
          onChange={(e) => dispatch(categoryChanged(e.target.value === ALL_CATEGORIES ? null : e.target.value))}
          disabled={categoriesFailed}
        >
          <MenuItem value={ALL_CATEGORIES}>All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.slug} value={c.slug}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ alignSelf: 'start' }}>
        <InputLabel id="sort-label">Sort by</InputLabel>
        <Select
          labelId="sort-label"
          label="Sort by"
          value={sort}
          onChange={(e) => dispatch(sortChanged(e.target.value as SortOption))}
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <MenuItem key={key} value={key}>
              {SORT_LABELS[key]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ alignSelf: 'start' }}>
        <InputLabel id="page-size-label">Per page</InputLabel>
        <Select
          labelId="page-size-label"
          label="Per page"
          value={pageSize}
          onChange={(e) => dispatch(pageSizeChanged(Number(e.target.value)))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        onClick={() => {
          setTerm('');
          dispatch(filtersReset());
        }}
        disabled={!hasActiveFilters}
        sx={{ alignSelf: 'start', height: 40 }}
      >
        Reset
      </Button>
    </Box>
  );
});
