import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Se as variáveis não estiverem definidas, continua sem autenticação
    if (!supabaseUrl || !supabaseAnonKey) {
        return supabaseResponse;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                supabaseResponse = NextResponse.next({
                    request,
                });
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Rotas protegidas que requerem autenticação
    const protectedRoutes = ['/dashboard', '/admin'];
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // Redireciona para login se não estiver autenticado em rotas protegidas
    if (isProtectedRoute && !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Rotas admin que precisam de verificação adicional
    if (pathname.startsWith('/admin') && user) {
        // Verifica se o usuário é admin consultando o auth-storage (compatibilidade)
        // ou através de metadados do usuário
        const authStorage = request.cookies.get('auth-storage');
        if (authStorage) {
            try {
                const authData = JSON.parse(authStorage.value);
                const localUser = authData?.state?.user;
                if (!localUser || localUser.role !== 'ADMIN') {
                    const url = request.nextUrl.clone();
                    url.pathname = '/dashboard';
                    return NextResponse.redirect(url);
                }
            } catch {
                // Continua se não conseguir parsear
            }
        }
    }

    // Redireciona para dashboard se já estiver autenticado e tentar acessar login
    if (pathname === '/login' && user) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    return supabaseResponse;
}
