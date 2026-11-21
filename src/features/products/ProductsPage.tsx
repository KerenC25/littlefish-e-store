import { useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { StatusMessage } from '../../shared/components/StatusMessage';
import { getErrorMessage } from '../../shared/utils/errors';
import { filtersReset, pageChanged, selectProductsQueryArgs } from './catalogSlice';
import { productSelectors, useGetProductsQuery, usePrefetch } from './productsApi';
import { CatalogToolbar } from './components/CatalogToolbar';
import { ProductGrid } from './components/ProductGrid';
import { ProductGridSkeleton } from './components/ProductGridSkeleton';

export const ProductsPage = () => {
  const dispatch = useAppDispatch();
  const args = useAppSelector(selectProductsQueryArgs);
  const { data, error, isLoading, isFetching, isError, refetch } = useGetProductsQuery(args);
  const prefetchProducts = usePrefetch('getProducts');

  const products = useMemo(() => (data ? productSelectors.selectAll(data) : []), [data]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / args.pageSize));

  // Warm the cache for the next page so "Next" feels instant.
  useEffect(() => {
    if (data && args.page < pageCount) prefetchProducts({ ...args, page: args.page + 1 }, { ifOlderThan: 60 });
  }, [args, data, pageCount, prefetchProducts]);

  const first = total === 0 ? 0 : (args.page - 1) * args.pageSize + 1;
  const last = Math.min(args.page * args.pageSize, total);

  return (
    <Box component="section" aria-labelledby="catalog-heading">
      <Box sx={{ mb: 3 }}>
        <Typography id="catalog-heading" variant="h4" component="h1" gutterBottom>
          Small shop. Big catch.
        </Typography>
        <Typography color="text.secondary">
          Hand-picked goods, prices in Rand, and zero load shedding at checkout.
        </Typography>
      </Box>

      <CatalogToolbar />

      {/* Polite live region: announces result counts without stealing focus. */}
      <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mb: 1, minHeight: 20 }}>
        {data && !isFetching && (total > 0 ? `Showing ${first}–${last} of ${total} products` : '')}
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
          description="No products match those filters. Try a different search or category."
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
  );
};

export default ProductsPage;
