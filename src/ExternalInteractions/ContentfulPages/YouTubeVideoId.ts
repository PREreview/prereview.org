import { Url, UrlParams } from '@effect/platform'
import { Option, pipe, Schema } from 'effect'

const YouTubeVideoIdBrand: unique symbol = Symbol.for('YouTubeVideoId')

export type YouTubeVideoId = typeof YouTubeVideoId.Type

export const YouTubeVideoId = pipe(
  Schema.String,
  Schema.pattern(/^[A-Za-z0-9_-]{11}$/),
  Schema.brand(YouTubeVideoIdBrand),
)

export const fromUrl = (url: URL): Option.Option<YouTubeVideoId> => {
  const host = url.hostname.replace(/^(?:www\.|m\.)/, '')

  if (host === 'youtu.be') {
    return Schema.decodeOption(YouTubeVideoId)(url.pathname.slice(1))
  }

  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') {
    return Option.none()
  }

  if (url.pathname === '/watch') {
    return pipe(Url.urlParams(url), UrlParams.getFirst('v'), Option.andThen(Schema.decodeOption(YouTubeVideoId)))
  }

  return pipe(
    Option.fromNullable(/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)),
    Option.flatMapNullable(matches => matches[1]),
    Option.andThen(Schema.decodeOption(YouTubeVideoId)),
  )
}

export const thumbnailUrl = (videoId: YouTubeVideoId): URL => new URL(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
