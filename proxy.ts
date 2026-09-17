import { NextResponse, type NextRequest } from 'next/server';

// Firebase uses client-side auth (onAuthStateChanged).
// Route protection is handled by the AppLayout component.
// This proxy only handles static/image pass-through.
export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
