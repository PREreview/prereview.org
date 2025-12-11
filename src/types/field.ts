import { ParseResult, pipe, Schema } from 'effect'
import { type SupportedLocale, translate } from '../locales/index.ts'
// eslint-disable-next-line import/no-internal-modules
import fields from './data/fields.json' with { type: 'json' }
import type { DomainId } from './domain.ts'

export type FieldId = keyof typeof fields

export const fieldIds = Object.keys(fields) as Array<FieldId>

export const FieldIdSchema = pipe(Schema.String, Schema.filter(isFieldId))

export const FieldIdFromOpenAlexUrlSchema = Schema.transformOrFail(Schema.URL, FieldIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/fields/')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(8)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: fieldId => ParseResult.succeed(new URL(`https://openalex.org/fields/${encodeURIComponent(fieldId)}`)),
})

export function getFieldName(id: FieldId, locale: SupportedLocale): string {
  return translate(locale, 'fields', `field${id}`)()
}

export const getFieldDomain = (id: FieldId) => fields[id].domain as DomainId

export function isFieldId(value: string): value is FieldId {
  return (fieldIds as ReadonlyArray<string>).includes(value)
}
