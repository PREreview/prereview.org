import { pipe, Schema, SchemaIssue, SchemaGetter, Effect } from 'effect'
import type { Html } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import subfields from './data/subfields.json' with { type: 'json' }
import type { DomainId } from './domain.ts'
import type { FieldId } from './field.ts'

export type SubfieldId = keyof typeof subfields

export const subfieldIds = Object.keys(subfields) as Array<SubfieldId>

export const SubfieldIdSchema = pipe(Schema.String, Schema.refine(isSubfieldId))

export const SubfieldIdFromOpenAlexUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(SubfieldIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/subfields/')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(11)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(subfieldId =>
      Effect.succeed(new URL(`https://openalex.org/subfields/${encodeURIComponent(subfieldId)}`)),
    ),
  }),
)

export function getSubfieldName(id: SubfieldId, locale: SupportedLocale): Html {
  return translate(locale, 'subfields', `subfield${id}`)()
}

export const getSubfieldDomain = (id: SubfieldId) => subfields[id].domain as DomainId

export const getSubfieldField = (id: SubfieldId) => subfields[id].field as FieldId

export function isSubfieldId(value: string): value is SubfieldId {
  return (subfieldIds as ReadonlyArray<string>).includes(value)
}
