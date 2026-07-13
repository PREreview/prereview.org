import { Data, type Either, Option } from 'effect'
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

export const fromChoice: (choice: Option.Option<ClubId | null>) => AddToAClubForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: choice => new CompletedForm({ addToClub: choice ?? 'not-a-club-review' }),
})
