import { pipe, Schema } from 'effect'
// eslint-disable-next-line import/no-internal-modules
import keywords from './data/keywords.json' with { type: 'json' }

export type KeywordId = keyof typeof keywords

export const keywordIds = Object.keys(keywords) as Array<KeywordId>

export const KeywordIdSchema = pipe(Schema.String, Schema.filter(isKeywordId))

export function isKeywordId(value: string): value is KeywordId {
  return (keywordIds as ReadonlyArray<string>).includes(value)
}
