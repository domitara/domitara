// Token is stored in an httpOnly cookie (set by the server) — JS cannot read it.
// The "logged_in" cookie (non-httpOnly) carries the user's role so the UI can
// gate routes and nav items without an extra API call.

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export const auth = {
  isAuthenticated: () => getCookie('logged_in') !== null,
  isAdmin: () => getCookie('logged_in') === 'admin',

  logout: async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
  },
};
