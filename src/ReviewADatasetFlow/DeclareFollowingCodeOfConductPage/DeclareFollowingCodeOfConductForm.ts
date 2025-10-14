import { Boolean, Data, type Either } from 'effect'

export type DeclareFollowingCodeOfConductForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  followingCodeOfConduct: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  followingCodeOfConduct: 'yes'
}> {}

export const fromHasBeenDeclared: (hasBeenDeclared: boolean) => DeclareFollowingCodeOfConductForm = Boolean.match({
  onFalse: () => new EmptyForm(),
  onTrue: () => new CompletedForm({ followingCodeOfConduct: 'yes' }),
})
