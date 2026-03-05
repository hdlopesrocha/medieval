// All command implementations were consolidated to a single no-op command.
// `getCommandFor` always returns the no-op command to keep the command lookup
// surface stable while removing per-command logic.
export function noop() {
  return { ok: true }
}

export function getCommandFor(_title: string) {
  return noop
}

export default { getCommandFor }
