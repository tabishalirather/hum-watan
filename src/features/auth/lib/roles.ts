// Admins are always treated as verified mentors for every mentor-capability
// check (reviewing referrals, acting as a referee, accessing /requests).
// They're still excluded from the public mentor map/directory — that's a
// listing concern, not a capability one.
export function isMentorCapable(role: string | null | undefined) {
  return role === "mentor" || role === "admin";
}

export function isAlwaysVerified(role: string | null | undefined) {
  return role === "admin";
}
