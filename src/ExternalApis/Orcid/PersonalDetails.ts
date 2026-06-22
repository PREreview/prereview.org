import { Data, Schema } from 'effect'
import { Name } from '../../types/index.ts'

export class PersonalDetails extends Schema.Class<PersonalDetails>('PersonalDetails')({
  name: Schema.NullOr(
    Schema.Struct({
      givenNames: Schema.propertySignature(
        Schema.NullOr(
          Schema.Struct({
            value: Name.NameSchema,
          }),
        ),
      ).pipe(Schema.fromKey('given-names')),
      familyName: Schema.propertySignature(
        Schema.NullOr(
          Schema.Struct({
            value: Name.NameSchema,
          }),
        ),
      ).pipe(Schema.fromKey('family-name')),
      creditName: Schema.propertySignature(
        Schema.NullOr(
          Schema.Struct({
            value: Name.NameSchema,
          }),
        ),
      ).pipe(Schema.fromKey('credit-name')),
    }),
  ),
}) {}

export class PersonalDetailsAreNotFound extends Data.TaggedError('PersonalDetailsAreNotFound')<{ cause?: unknown }> {}

export class PersonalDetailsAreUnavailable extends Data.TaggedError('PersonalDetailsAreUnavailable')<{
  cause?: unknown
}> {}
