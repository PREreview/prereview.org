import { Data, Option, type Either } from 'effect'

export type FollowsFairAndCarePrinciplesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  followsFairAndCarePrinciples: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  followsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
}> {}

export const fromAnswer: (
  answer: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>,
) => FollowsFairAndCarePrinciplesForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: answer => new CompletedForm({ followsFairAndCarePrinciples: answer }),
})
