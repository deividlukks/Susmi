import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas admin que precisam de proteção
  if (pathname.startsWith('/admin')) {
    const authStorage = request.cookies.get('auth-storage');

    if (!authStorage) {
      // Redireciona para login se não estiver autenticado
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const authData = JSON.parse(authStorage.value);
      const user = authData?.state?.user;

      // Verifica se o usuário é admin
      if (!user || user.role !== 'ADMIN') {
        // Redireciona para dashboard se não for admin
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      // Se houver erro ao parsear, redireciona para login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
