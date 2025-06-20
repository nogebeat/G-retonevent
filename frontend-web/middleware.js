import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_FILE = /\.(.*)$/; // Ignore les fichiers publics

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Laisser passer les fichiers statiques et l'API
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/') ||
    pathname.startsWith('/unauthorized') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // OPTIONS preflight (CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT',
        'Access-Control-Allow-Headers':
          'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
      },
    });
  }

  let token = request.cookies.get('token')?.value;

  const authHeader = request.headers.get('Authorization');
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Si pas de token et la page est protégée, on redirige
  if (!token && pathname.startsWith('/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-role', payload.role); // Exemple : ajouter rôle dans le header

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch (err) {
      console.error('JWT invalid:', err.message);
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/crp/:path*'],
};
