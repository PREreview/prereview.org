import { Schema } from 'effect'
import { NonEmptyString } from '../../types/index.js'

export class PersonalDetails extends Schema.Class<PersonalDetails>('PersonalDetails')({
  name: Schema.NullOr(
    Schema.Struct({
      givenNames: Schema.propertySignature(
        Schema.NullOr(
          Schema.Struct({
            value: Schema.compose(Schema.Trim, NonEmptyString.NonEmptyStringSchema),
          }),
        ),
      ).pipe(Schema.fromKey('given-names')),
      familyName: Schema.propertySignature(
        Schema.NullOr(
          Schema.Struct({
            value: Schema.compose(Schema.Trim, NonEmptyString.NonEmptyStringSchema),
          }),
        ),
      ).pipe(Schema.fromKey('family-name')),
      creditName: Schema.propertySignature(
        Schema.NullOr(
          Schema.Struct({
            value: Schema.compose(Schema.Trim, NonEmptyString.NonEmptyStringSchema),
          }),
        ),
      ).pipe(Schema.fromKey('credit-name')),
    }),
  ),
}) {}
