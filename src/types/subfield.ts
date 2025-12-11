import { ParseResult, pipe, Schema } from 'effect'
import { type SupportedLocale, translate } from '../locales/index.ts'
// eslint-disable-next-line import/no-internal-modules
import subfields from './data/subfields.json' with { type: 'json' }

export type SubfieldId = keyof typeof subfields

export const subfieldIds = Object.keys(subfields) as Array<SubfieldId>

export const SubfieldIdSchema = pipe(Schema.String, Schema.filter(isSubfieldId))

export const SubfieldIdFromOpenAlexUrlSchema = Schema.transformOrFail(Schema.URL, SubfieldIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/subfields/')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(11)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: subfieldId =>
    ParseResult.succeed(new URL(`https://openalex.org/subfields/${encodeURIComponent(subfieldId)}`)),
})

export function getSubfieldName(id: SubfieldId, locale: SupportedLocale): string {
  return translate(locale, 'subfields', `subfield${id}`)()
}

export function isSubfieldId(value: string): value is SubfieldId {
  return (subfieldIds as ReadonlyArray<string>).includes(value)
}
