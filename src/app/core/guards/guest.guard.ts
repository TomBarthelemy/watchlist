import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupaService } from '../services/supa.service';

/**
 * Guest Guard
 * Prevents already-authenticated users from accessing the login page.
 * Redirects to /watchlists if a session exists.
 */
export const guestGuard: CanActivateFn = async () => {
  const supa = inject(SupaService);
  const router = inject(Router);

  const { data: { session } } = await supa.supa.auth.getSession();

  if (session?.user) {
    router.navigateByUrl('/watchlists');
    return false;
  }

  return true;
};
