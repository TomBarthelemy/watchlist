import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupaService } from '../services/supa.service';

/**
 * Auth Guard
 * Prevents access to protected routes unless user is authenticated.
 * Uses getSession() (async) to avoid race conditions on page load where
 * the user signal may not yet be populated.
 */
export const authGuard: CanActivateFn = async () => {
  const supa = inject(SupaService);
  const router = inject(Router);

  // getSession() is async and waits for the token to be resolved
  const { data: { session } } = await supa.supa.auth.getSession();

  if (session?.user) {
    // Keep signal in sync in case it hasn't been updated yet
    if (!supa.user()) {
      supa.user.set(session.user);
    }
    return true;
  }

  router.navigateByUrl('/login');
  return false;
};
