import { pipe, Schema } from 'effect'
import { type SupportedLocale, translate } from '../locales/index.ts'
// eslint-disable-next-line import/no-internal-modules
import fields from './data/fields.json' with { type: 'json' }

export type FieldId = keyof typeof fields

export const fieldIds = Object.keys(fields) as Array<FieldId>

export const FieldIdSchema = pipe(Schema.String, Schema.filter(isFieldId))

export function getFieldName(id: FieldId, locale: SupportedLocale): string {
  return translate(locale, 'fields', `field${id}`)()
}

export function isFieldId(value: string): value is FieldId {
  return (fieldIds as ReadonlyArray<string>).includes(value)
}
