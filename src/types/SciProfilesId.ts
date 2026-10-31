import { flow, pipe, Schema, Tuple, SchemaTransformation } from 'effect'

export type SciProfilesId = typeof SciProfilesIdSchema.Type

export const SciProfilesIdSchema = pipe(
  Schema.String,
  Schema.check(Schema.isPattern(/^[1-9][0-9]*$/)),
  Schema.brand('SciProfilesId'),
)

export const SciProfilesIdFromUrlSchema = Schema.TemplateLiteralParser([
  'https://sciprofiles.com/profile/',
  SciProfilesIdSchema,
]).pipe(
  Schema.decodeTo(
    Schema.toType(SciProfilesIdSchema),
    SchemaTransformation.transform({
      decode: Tuple.get(1),
      encode: id => ['https://sciprofiles.com/profile/', id] as const,
    }),
  ),
)

export const SciProfilesId = (sciProfilesId: string) => SciProfilesIdSchema.make(sciProfilesId)

export const toUrl: (sciProfilesId: SciProfilesId) => URL = flow(
  Schema.encodeSync(SciProfilesIdFromUrlSchema),
  url => new URL(url),
)
