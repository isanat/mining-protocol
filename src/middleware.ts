import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - api routes
  // - _next/static files
  // - _next/image files
  // - favicon.ico
  // - public files (images, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
