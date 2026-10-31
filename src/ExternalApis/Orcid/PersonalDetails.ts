import { Data, Schema } from 'effect'
import { Name } from '../../types/index.ts'

export class PersonalDetails extends Schema.Class<PersonalDetails>('PersonalDetails')({
  name: Schema.NullOr(
    Schema.Struct({
      givenNames: Schema.NullOr(Schema.Struct({ value: Name.NameSchema })),
      familyName: Schema.NullOr(Schema.Struct({ value: Name.NameSchema })),
      creditName: Schema.NullOr(Schema.Struct({ value: Name.NameSchema })),
    }).pipe(Schema.encodeKeys({ givenNames: 'given-names', familyName: 'family-name', creditName: 'credit-name' })),
  ),
}) {}

export class PersonalDetailsAreNotFound extends Data.TaggedError('PersonalDetailsAreNotFound')<{ cause?: unknown }> {}

export class PersonalDetailsAreUnavailable extends Data.TaggedError('PersonalDetailsAreUnavailable')<{
  cause?: unknown
}> {}
