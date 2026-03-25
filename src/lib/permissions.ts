/** Check if user role allows team management (invite/remove members). */
export function canManageTeam(role: string): boolean {
  return role === "owner";
}
