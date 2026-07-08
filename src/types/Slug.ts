import { Array, pipe, Schema, type Brand } from 'effect'
import { NonEmptyStringSchema, type NonEmptyString } from './NonEmptyString.ts'

const SlugBrand: unique symbol = Symbol.for('Slug')

export type Slug = NonEmptyString & Brand.Brand<typeof SlugBrand>

export const SlugSchema = pipe(
  NonEmptyStringSchema,
  Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  Schema.brand(SlugBrand),
).annotations({
  arbitrary: () => fc =>
    fc
      .array(
        fc.mapToConstant(
          { num: 26, build: v => String.fromCharCode(v + 0x61) },
          { num: 10, build: v => String.fromCharCode(v + 0x30) },
        ),
        { minLength: 1 },
      )
      .map(Array.join('-'))
      .map(Slug),
})

export const Slug = (slug: string) => SlugSchema.make(slug)
