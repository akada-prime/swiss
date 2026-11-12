// A manual portal volume survives changes to the employee suggestion, including zero.
export const suggestedPortalUsers = employees => Math.ceil(Math.max(0, Number(employees) || 0) / 2);
export function portalUsers(dimensions) {
  return Object.hasOwn(dimensions, 'portalUsers') ? dimensions.portalUsers : suggestedPortalUsers(dimensions.employees);
}
