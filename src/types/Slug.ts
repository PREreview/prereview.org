import { pipe, Schema, type Brand } from 'effect'
import { NonEmptyStringSchema, type NonEmptyString } from './NonEmptyString.ts'

export type Slug = NonEmptyString & Brand.Brand<'Slug'>

export const SlugSchema = pipe(
  NonEmptyStringSchema,
  Schema.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  Schema.brand('Slug'),
)

export const Slug = (slug: string) => SlugSchema.make(slug)
