import { useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { StatusMessage } from '../../shared/components/StatusMessage';
import { getErrorMessage } from '../../shared/utils/errors';
import { brandPage } from './brands';
import { brandChanged, filtersReset, pageChanged, selectProductsQueryArgs } from './catalogSlice';
import { productSelectors, useGetCatalogIndexQuery, useGetProductsQuery, usePrefetch } from './productsApi';
import { BrandRail } from './components/BrandRail';
import { CatalogToolbar } from './components/CatalogToolbar';
import { Hero } from './components/Hero';
import { ProductGrid } from './components/ProductGrid';
import { ProductGridSkeleton } from './components/ProductGridSkeleton';

export const ProductsPage = () => {
  const dispatch = useAppDispatch();
  const args = useAppSelector(selectProductsQueryArgs);
  const byBrand = args.brand !== null;

  // Two data sources, one shape: server-paged results, or brand results paged client-side
  // from the cached catalogue index (DummyJSON has no brand filter).
  const listQuery = useGetProductsQuery(args, { skip: byBrand });
  const indexQuery = useGetCatalogIndexQuery();
  const brandResult = useMemo(
    () => (byBrand && indexQuery.data ? brandPage(indexQuery.data, args) : undefined),
    [byBrand, indexQuery.data, args],
  );

  const data = byBrand ? brandResult : listQuery.data;
  const { error, isLoading, isFetching, isError, refetch } = byBrand ? indexQuery : listQuery;
  const prefetchProducts = usePrefetch('getProducts');

  const products = useMemo(() => (data ? productSelectors.selectAll(data) : []), [data]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / args.pageSize));

  // Warm the cache for the next server page so "Next" feels instant.
  useEffect(() => {
    if (!byBrand && data && args.page < pageCount) prefetchProducts({ ...args, page: args.page + 1 }, { ifOlderThan: 60 });
  }, [args, byBrand, data, pageCount, prefetchProducts]);

  const first = total === 0 ? 0 : (args.page - 1) * args.pageSize + 1;
  const last = Math.min(args.page * args.pageSize, total);
  const summary = total > 0 ? `Showing ${first}–${last} of ${total} products${byBrand ? ` from ${args.brand}` : ''}` : '';

  return (
    <>
      <Hero />
      <BrandRail />

      <Box component="section" id="results" aria-labelledby="results-heading" sx={{ scrollMarginTop: 96 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Typography id="results-heading" variant="h5" component="h2">
            {byBrand ? args.brand : 'Fresh in the shop'}
          </Typography>
          {byBrand && (
            <Button
              size="small"
              variant="outlined"
              endIcon={<CloseIcon aria-hidden />}
              onClick={() => dispatch(brandChanged(null))}
            >
              Clear brand: {args.brand}
            </Button>
          )}
        </Box>

        <CatalogToolbar />

        {/* Polite live region: announces result counts without stealing focus. */}
        <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mb: 1, minHeight: 20 }}>
          {data && !isFetching ? summary : ''}
        </Typography>

        <Box sx={{ height: 4, mb: 1 }}>{isFetching && !isLoading && <LinearProgress aria-label="Updating results" />}</Box>

        {isLoading ? (
          <ProductGridSkeleton />
        ) : isError ? (
          <StatusMessage
            role="alert"
            illustration="🎣"
            title="The products got away"
            description={getErrorMessage(error)}
            actionLabel="Cast again"
            onAction={refetch}
          />
        ) : products.length === 0 ? (
          <StatusMessage
            illustration="🐟"
            title="Nothing biting"
            description="No products match those filters. Try a different search, category or brand."
            actionLabel="Clear filters"
            onAction={() => dispatch(filtersReset())}
          />
        ) : (
          <Box sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 150ms' }} aria-busy={isFetching}>
            <ProductGrid products={products} offset={(args.page - 1) * args.pageSize} total={total} />
          </Box>
        )}

        {pageCount > 1 && !isError && (
          <Box component="nav" aria-label="Product pages" sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={pageCount}
              page={Math.min(args.page, pageCount)}
              onChange={(_e, page) => dispatch(pageChanged(page))}
              color="primary"
              shape="rounded"
              siblingCount={1}
            />
          </Box>
        )}
      </Box>
    </>
  );
};

export default ProductsPage;
