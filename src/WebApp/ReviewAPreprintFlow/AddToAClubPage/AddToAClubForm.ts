import type { UrlParams } from 'effect/http'
import { Data, Result, Option, pipe, Schema, Struct } from 'effect'
import { type Uuid, UuidSchema } from '../../../types/Uuid.ts'

export type AddToAClubForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<AddToAClubForm, InvalidForm>

export type SubmittedForm = Exclude<AddToAClubForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  addToClub: Result.Result<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  addToClub: Uuid | 'not-a-club-review'
}> {}

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const addToClub = pipe(
    Schema.decodeResult(AddToClubFieldSchema)(body),
    Result.mapBoth({
      onSuccess: Struct.get('addToClub'),
      onFailure: () => new Missing(),
    }),
  )

  return Result.match(addToClub, {
    onSuccess: addToClub => new CompletedForm({ addToClub }),
    onFailure: addToClub => new InvalidForm({ addToClub: Result.fail(addToClub) }),
  })
}

export const fromChoice: (choice: Option.Option<Uuid | null>) => ValidForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: choice => new CompletedForm({ addToClub: choice ?? 'not-a-club-review' }),
})

const AddToClubFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      addToClub: Schema.Union([UuidSchema, Schema.Literal('not-a-club-review')]),
    }),
  ),
)
