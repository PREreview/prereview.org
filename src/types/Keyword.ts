import crypto from 'crypto'
import { ParseResult, pipe, Schema } from 'effect'
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
