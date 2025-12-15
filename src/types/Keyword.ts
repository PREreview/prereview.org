import crypto from 'crypto'
import { Array, ParseResult, pipe, Record, Schema } from 'effect'
import Fuse from 'fuse.js'
// eslint-disable-next-line import/no-internal-modules
import keywords from './data/keywords.json' with { type: 'json' }

export type KeywordId = keyof typeof keywords

export const keywordIds = Object.keys(keywords) as Array<KeywordId>

export const KeywordIdSchema = pipe(Schema.String, Schema.filter(isKeywordId))

export const KeywordIdFromOpenAlexUrlSchema = Schema.transformOrFail(Schema.URLFromSelf, KeywordIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/keywords/')
      ? ParseResult.succeed(
          crypto
            .createHash('shake256', { outputLength: 10 })
            .update(decodeURIComponent(url.pathname.substring(10)))
            .digest('hex'),
        )
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: (keywordId, _, ast) =>
    ParseResult.fail(
      new ParseResult.Forbidden(ast, keywordId, "Encoding keyword IDs to OpenAlex URLs isn't supported"),
    ),
})

export function isKeywordId(value: string): value is KeywordId {
  return (keywordIds as ReadonlyArray<string>).includes(value)
}

const fuse = new Fuse(
  Array.map(Record.toEntries(keywords), ([key, value]) => ({ id: key, ...value })),
  { keys: ['name'], threshold: 0.2 },
)

export const search = (value: string) => {
  return Array.map(fuse.search(value, { limit: 10 }), result => result.item.id)
}
