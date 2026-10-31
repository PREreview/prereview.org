import { pipe, Schema, SchemaIssue, SchemaGetter, Effect } from 'effect'
import type { Html } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import fields from './data/fields.json' with { type: 'json' }
import type { DomainId } from './domain.ts'

export type FieldId = keyof typeof fields

export const fieldIds = Object.keys(fields) as Array<FieldId>

export const FieldIdSchema = pipe(Schema.String, Schema.refine(isFieldId))

export const FieldIdFromOpenAlexUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(FieldIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/fields/')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(8)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(fieldId =>
      Effect.succeed(new URL(`https://openalex.org/fields/${encodeURIComponent(fieldId)}`)),
    ),
  }),
)

export function getFieldName(id: FieldId, locale: SupportedLocale): Html {
  return translate(locale, 'fields', `field${id}`)()
}

export const getFieldDomain = (id: FieldId) => fields[id].domain as DomainId

export function isFieldId(value: string): value is FieldId {
  return (fieldIds as ReadonlyArray<string>).includes(value)
}
