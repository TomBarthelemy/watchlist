import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SupaService } from '../services/supa.service';

/**
 * Membership Guard
 * Prevents access to watchlist routes unless user is a member of the list
 * Checks the list_members table for membership
 */
export const membershipGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const supa = inject(SupaService);
  const router = inject(Router);

  // Use getSession() (async) to avoid race conditions on page load
  const { data: { session } } = await supa.supa.auth.getSession();
  const user = session?.user;

  if (!user) {
    console.warn('[membershipGuard] No authenticated user');
    router.navigateByUrl('/login');
    return false;
  }

  const listId = route.paramMap.get('id');
  if (!listId) {
    console.warn('[membershipGuard] No listId in route params');
    router.navigateByUrl('/watchlists');
    return false;
  }

  try {
    // Check if user is a member of this watchlist
    // list_members has no 'id' column — select 'user_id' instead
    const { data, error } = await supa.supa
      .from('list_members')
      .select('user_id')
      .eq('list_id', listId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[membershipGuard] Database error:', error.message, error.code);
      router.navigateByUrl('/');
      return false;
    }

    if (!data) {
      console.warn('[membershipGuard] User is not a member of this watchlist', { listId, userId: user.id });
      router.navigateByUrl('/watchlists');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[membershipGuard] Error checking membership:', err);
    router.navigateByUrl('/watchlists');
    return false;
  }
};
