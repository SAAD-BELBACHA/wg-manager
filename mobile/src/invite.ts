// Key under which a pending WG invite code is stashed while the user goes
// through the auth flow (from a shared /join?code= link). wg-setup reads and
// clears it once the user reaches the join/create screen.
export const PENDING_INVITE_KEY = 'zofri.pendingInvite';
