import { UrlParams } from '@effect/platform'
import { Data, Either, Option, pipe, Schema, Struct } from 'effect'
import { Uuid, UuidSchema } from '../../../types/Uuid.ts'

export type AddToAClubForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<AddToAClubForm, InvalidForm>

export type SubmittedForm = Exclude<AddToAClubForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  addToClub: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  addToClub: Uuid | 'not-a-club-review'
}> {}

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const addToClub = pipe(
    Schema.decodeEither(AddToClubFieldSchema)(body),
    Either.mapBoth({
      onRight: Struct.get('addToClub'),
      onLeft: () => new Missing(),
    }),
  )

  return Either.match(addToClub, {
    onRight: addToClub => new CompletedForm({ addToClub }),
    onLeft: addToClub => new InvalidForm({ addToClub: Either.left(addToClub) }),
  })
}

export const fromChoice: (choice: Option.Option<Uuid | null>) => ValidForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: choice => new CompletedForm({ addToClub: choice ? Uuid(choice) : 'not-a-club-review' }),
})

const AddToClubFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    addToClub: Schema.Union(UuidSchema, Schema.Literal('not-a-club-review')),
  }),
)
