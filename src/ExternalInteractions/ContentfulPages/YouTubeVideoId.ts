import { flow, Option, pipe, Schema, String, Tuple } from 'effect'

const YouTubeVideoIdBrand: unique symbol = Symbol.for('YouTubeVideoId')

export type YouTubeVideoId = typeof YouTubeVideoId.Type

export const YouTubeVideoId = pipe(
  Schema.String,
  Schema.pattern(/^[A-Za-z0-9_-]{11}$/),
  Schema.brand(YouTubeVideoIdBrand),
)

export const fromUrl: (url: URL) => Option.Option<YouTubeVideoId> = flow(
  url => url.href,
  String.match(
    /^https?:\/\/(?:youtu\.be\/|(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^&#]*&)*?v=|(?:embed|shorts|live)\/))([A-Za-z0-9_-]{11})(?:[/?&#].*)?$/,
  ),
  Option.andThen(Tuple.at(1)),
  Option.andThen(Schema.decodeOption(YouTubeVideoId)),
)

export const thumbnailUrl = (videoId: YouTubeVideoId): URL => new URL(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
