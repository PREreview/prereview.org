import { pipe, Schema, SchemaIssue, SchemaGetter, Effect } from 'effect'
import crypto from 'node:crypto'
import keywords from './data/keywords.json' with { type: 'json' }

export type KeywordId = keyof typeof keywords

export const keywordIds = Object.keys(keywords) as Array<KeywordId>

export const KeywordIdSchema = pipe(Schema.String, Schema.refine(isKeywordId))

export const KeywordIdFromOpenAlexUrlSchema = Schema.URL.pipe(
  Schema.decodeTo(KeywordIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/keywords/')
        ? Effect.succeed(
            crypto
              .createHash('shake256', { outputLength: 10 })
              .update(decodeURIComponent(url.pathname.slice(10)))
              .digest('hex'),
          )
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(keywordId =>
      Effect.fail(
        new SchemaIssue.Forbidden({ message: "Encoding keyword IDs to OpenAlex URLs isn't supported" }, keywordId),
      ),
    ),
  }),
)

export function getKeywordName(id: KeywordId): string {
  return keywords[id].name
}

export function isKeywordId(value: string): value is KeywordId {
  return (keywordIds as ReadonlyArray<string>).includes(value)
}
