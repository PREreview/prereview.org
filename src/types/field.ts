import { pipe, Schema } from 'effect'
import { type SupportedLocale, translate } from '../locales/index.ts'

export type FieldId = (typeof fieldIds)[number]

export const fieldIds = [
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
] as const

export const FieldIdSchema = pipe(Schema.String, Schema.filter(isFieldId))

export function getFieldName(id: FieldId, locale: SupportedLocale): string {
  return translate(locale, 'fields', `field${id}`)()
}

export function isFieldId(value: string): value is FieldId {
  return (fieldIds as ReadonlyArray<string>).includes(value)
}
