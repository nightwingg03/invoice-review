const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

// Same-origin container builds set VITE_API_BASE_URL=/ so fetches stay relative.
export const apiBaseUrl =
  configuredBaseUrl === '/'
    ? ''
    : (configuredBaseUrl ?? 'http://localhost:8000').replace(/\/$/, '')
