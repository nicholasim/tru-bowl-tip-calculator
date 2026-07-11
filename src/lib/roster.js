/** Build an id -> employee lookup map from a full roster (active + inactive). */
export function buildRosterMap(roster) {
  return Object.fromEntries(roster.map((e) => [e.id, e]))
}

/**
 * Display name for an employee id, looked up in a full (active + inactive)
 * roster map. An inactive employee who still has historical entries keeps
 * their name, with a suffix marking them as former -- only an id with no
 * matching row at all (e.g. hard-deleted before soft-delete existed) falls
 * back to the generic label.
 */
export function getEmployeeDisplayName(rosterMap, employeeId) {
  const employee = rosterMap[employeeId]
  if (!employee) return 'Former employee'
  return employee.active === false ? `${employee.name} (former employee)` : employee.name
}
