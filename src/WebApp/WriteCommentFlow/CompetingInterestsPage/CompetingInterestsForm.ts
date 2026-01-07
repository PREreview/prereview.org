import { Data, Effect, Either, Match, pipe, Schema } from 'effect'
import type * as Comments from '../../../Comments/index.ts'
import { NonEmptyString } from '../../../types/index.ts'

export type CompetingInterestsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  competingInterests: Either.Either<'yes', Missing>
  competingInterestsDetails: Either.Either<string, Missing>
}> {}

type CompletedForm = CompletedFormNo | CompletedFormYes

export class CompletedFormNo extends Data.TaggedClass('CompletedFormNo')<{
  competingInterests: 'no'
}> {}

export class CompletedFormYes extends Data.TaggedClass('CompletedFormYes')<{
  competingInterests: 'yes'
  competingInterestsDetails: NonEmptyString.NonEmptyString
}> {}

export const fromBody = (body: unknown) =>
  Effect.gen(function* () {
    const { competingInterests, competingInterestsDetails } = yield* Schema.decodeUnknown(
      CompetingInterestsFieldsSchema,
      {
        errors: 'all',
        exact: false,
      },
    )(body)

    if (competingInterests === 'no') {
      return new CompletedFormNo({ competingInterests })
    }

    if (!NonEmptyString.isNonEmptyString(competingInterestsDetails)) {
      return new InvalidForm({
        competingInterests: Either.right(competingInterests),
        competingInterestsDetails: Either.left(new Missing()),
      })
    }

    return new CompletedFormYes({ competingInterests, competingInterestsDetails })
  }).pipe(
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          competingInterests: Either.left(new Missing()),
          competingInterestsDetails: Either.right(''),
        }),
      ),
    ),
  )

export const fromComment = pipe(
  Match.type<Comments.CommentInProgress | Comments.CommentReadyForPublishing>(),
  Match.tag('CommentInProgress', ({ competingInterests }) =>
    pipe(
      Match.value(competingInterests),
      Match.when(undefined, () => new EmptyForm()),
      Match.tag(
        'Some',
        competingInterests =>
          new CompletedFormYes({ competingInterests: 'yes', competingInterestsDetails: competingInterests.value }),
      ),
      Match.tag('None', () => new CompletedFormNo({ competingInterests: 'no' })),
      Match.exhaustive,
    ),
  ),
  Match.tag('CommentReadyForPublishing', ({ competingInterests }) =>
    pipe(
      Match.value(competingInterests),
      Match.tag(
        'Some',
        competingInterests =>
          new CompletedFormYes({ competingInterests: 'yes', competingInterestsDetails: competingInterests.value }),
      ),
      Match.tag('None', () => new CompletedFormNo({ competingInterests: 'no' })),
      Match.exhaustive,
    ),
  ),
  Match.exhaustive,
)

const CompetingInterestsFieldsSchema = Schema.Struct({
  competingInterests: Schema.Literal('yes', 'no'),
  competingInterestsDetails: Schema.String,
})
