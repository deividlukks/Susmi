import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que requerem autenticação
const protectedRoutes = ['/dashboard'];

// Rotas públicas (não requerem autenticação)
const publicRoutes = ['/', '/login'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Verificar se é uma rota protegida
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // Verificar se é uma rota pública
    const isPublicRoute = publicRoutes.includes(pathname);

    // Para rotas protegidas, a verificação do token será feita no lado do cliente
    // O middleware Next.js não tem acesso ao localStorage
    // A proteção real acontece no dashboard/layout.tsx

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
