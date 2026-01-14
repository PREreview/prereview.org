import { flow, pipe, Schema, Tuple } from 'effect'

const SciProfilesIdBrand: unique symbol = Symbol.for('SciProfilesId')

export type SciProfilesId = typeof SciProfilesIdSchema.Type

export const SciProfilesIdSchema = pipe(
  Schema.String,
  Schema.pattern(/^[1-9][0-9]*$/),
  Schema.brand(SciProfilesIdBrand),
)

export const SciProfilesIdFromUrlSchema = Schema.transform(
  Schema.TemplateLiteralParser('https://sciprofiles.com/profile/', SciProfilesIdSchema),
  Schema.typeSchema(SciProfilesIdSchema),
  {
    strict: true,
    decode: Tuple.at(1),
    encode: id => Tuple.make('https://sciprofiles.com/profile/' as const, id),
  },
)

export const SciProfilesId = (sciProfilesId: string) => SciProfilesIdSchema.make(sciProfilesId)

export const toUrl: (sciProfilesId: SciProfilesId) => URL = flow(
  Schema.encodeSync(SciProfilesIdFromUrlSchema),
  url => new URL(url),
)
