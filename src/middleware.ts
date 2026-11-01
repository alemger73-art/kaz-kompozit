import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/server/auth/token';

const PUBLIC_FILE = /\.(.*)$/;
const LOCALES = ['ru', 'kk'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Админка: всё, кроме страницы входа, — только с действующей сессией.
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = new URL('/admin/login', request.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  // Публичные страницы без префикса языка → русская версия.
  const first = pathname.split('/')[1];
  if (!LOCALES.includes(first)) {
    const preferKazakh = request.headers.get('accept-language')?.toLowerCase().startsWith('kk');
    const url = request.nextUrl.clone();
    url.pathname = `/${preferKazakh ? 'kk' : 'ru'}${pathname === '/' ? '' : pathname}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.svg|robots.txt|sitemap.xml|og.png).*)'] };
