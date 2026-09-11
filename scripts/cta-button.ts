export function normalizeButtonUrl(rawUrl: string): string | null {
  const url = rawUrl.trim()
  if (url.length === 0) return null
  if (/^https?:\/\//i.test(url)) return url
  if (/^mailto:/i.test(url)) return url
  if (url.includes('@') && !url.includes('/')) return `mailto:${url}`
  return `https://${url}`
}

export function buttonKey(text: string, url: string): string {
  return JSON.stringify([text, url])
}
