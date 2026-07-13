import { Data, type Either } from 'effect'
import type { ClubId } from '../../../Clubs/index.ts'

export type AddToAClubForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  addToClub: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  addToClub: ClubId | 'not-a-club-review'
}> {}
