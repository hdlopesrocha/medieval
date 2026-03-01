// Simple runtime-safe asset URL helper.
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const cleanBase = base.replace(/\/$/, '')
  const cleanPath = path.replace(/^\/+/, '')
  // If base is root ('/'), return '/'+cleanPath so it stays absolute.
  return (cleanBase || '') + '/' + cleanPath
}

export default asset
