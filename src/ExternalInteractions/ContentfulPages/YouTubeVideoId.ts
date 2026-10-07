import { Option, pipe, Schema, String } from 'effect'

const YouTubeVideoIdBrand: unique symbol = Symbol.for('YouTubeVideoId')

export type YouTubeVideoId = typeof YouTubeVideoId.Type

export const YouTubeVideoId = pipe(
  Schema.String,
  Schema.pattern(/^[A-Za-z0-9_-]{11}$/),
  Schema.brand(YouTubeVideoIdBrand),
)

export const fromUrl = (url: URL): Option.Option<YouTubeVideoId> => {
  const host = url.hostname.replace(/^(?:www\.|m\.)/, '')

  const candidate =
    host === 'youtu.be'
      ? Option.some(url.pathname.slice(1))
      : host === 'youtube.com' || host === 'youtube-nocookie.com'
        ? url.pathname === '/watch'
          ? Option.fromNullable(url.searchParams.get('v'))
          : Option.fromNullable(/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1])
        : Option.none()

  return pipe(candidate, Option.map(String.trim), Option.filter(Schema.is(YouTubeVideoId)))
}

export const thumbnailUrl = (videoId: YouTubeVideoId): URL => new URL(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
