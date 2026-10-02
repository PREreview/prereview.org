import { Option, pipe, String } from 'effect'

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/

export const fromUrl = (url: URL): Option.Option<string> => {
  const host = url.hostname.replace(/^(?:www\.|m\.)/, '')

  const candidate =
    host === 'youtu.be'
      ? Option.some(url.pathname.slice(1))
      : host === 'youtube.com' || host === 'youtube-nocookie.com'
        ? url.pathname === '/watch'
          ? Option.fromNullable(url.searchParams.get('v'))
          : Option.fromNullable(/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1])
        : Option.none()

  return pipe(
    candidate,
    Option.map(String.trim),
    Option.filter(id => videoIdPattern.test(id)),
  )
}

export const thumbnailUrl = (videoId: string): URL => new URL(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
