import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { __resetRefreshLockForTests } from '../services/baseQueryWithReauth';

expect.extend(toHaveNoViolations);

// jsdom does not implement scrolling.
window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;

afterEach(() => {
  jest.restoreAllMocks();
  __resetRefreshLockForTests();
});
