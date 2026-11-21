import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { __resetRefreshLockForTests } from '../services/baseQueryWithReauth';

expect.extend(toHaveNoViolations);

// Lazily loaded routes are compiled on first import under ts-jest, which can exceed the 1 s
// default for findBy* queries in the first test that visits them.
configure({ asyncUtilTimeout: 4000 });

// jsdom does not implement scrolling.
window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;

afterEach(() => {
  jest.restoreAllMocks();
  __resetRefreshLockForTests();
});
