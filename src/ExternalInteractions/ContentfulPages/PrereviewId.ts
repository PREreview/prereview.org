import { Array, Effect, Option, pipe, Schema, SchemaGetter, SchemaIssue, String } from 'effect'
import { Uuid } from '../../types/index.ts'

export type PrereviewId = number | Uuid.Uuid

const fromUrl = (url: URL): Option.Option<PrereviewId> => {
  if (url.origin !== 'https://prereview.org') {
    return Option.none()
  }

  return pipe(
    url.pathname,
    String.match(/^\/reviews\/([^/]+)$/),
    Option.flatMap(Array.get(1)),
    Option.flatMap((id): Option.Option<PrereviewId> =>
      /^\d+$/.test(id) ? Option.some(globalThis.Number(id)) : Schema.decodeOption(Uuid.UuidSchema)(id),
    ),
  )
}

export const PrereviewIdFromUrl = Schema.URLFromString.pipe(
  Schema.decodeTo(Schema.Union([Schema.Number, Uuid.UuidSchema]), {
    decode: SchemaGetter.transformEffect(url =>
      Option.match(fromUrl(url), {
        onNone: () => Effect.fail(new SchemaIssue.InvalidValue({ message: 'Not a PREreview URL' }, url)),
        onSome: Effect.succeed,
      }),
    ),
    encode: SchemaGetter.transform(id => new URL(`https://prereview.org/reviews/${id}`)),
  }),
)
