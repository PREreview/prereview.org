import { Data, Effect, Result, Match, pipe, Schema } from 'effect'
import type * as Comments from '../../../Domain/Comments/index.ts'
import { NonEmptyString } from '../../../types/index.ts'

export type CompetingInterestsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  competingInterests: Result.Result<'yes', Missing>
  competingInterestsDetails: Result.Result<string, Missing>
}> {}

type CompletedForm = CompletedFormNo | CompletedFormYes

export class CompletedFormNo extends Data.TaggedClass('CompletedFormNo')<{
  competingInterests: 'no'
}> {}

export class CompletedFormYes extends Data.TaggedClass('CompletedFormYes')<{
  competingInterests: 'yes'
  competingInterestsDetails: NonEmptyString.NonEmptyString
}> {}

export const fromBody = Effect.fnUntraced(
  function* (body: unknown) {
    const { competingInterests, competingInterestsDetails } = yield* Schema.decodeUnknownEffect(
      CompetingInterestsFieldsSchema,
      { errors: 'all' },
    )(body)

    if (competingInterests === 'no') {
      return new CompletedFormNo({ competingInterests })
    }

    if (!NonEmptyString.isNonEmptyString(competingInterestsDetails)) {
      return new InvalidForm({
        competingInterests: Result.succeed(competingInterests),
        competingInterestsDetails: Result.fail(new Missing()),
      })
    }

    return new CompletedFormYes({ competingInterests, competingInterestsDetails })
  },
  Effect.catchTag('SchemaError', () =>
    Effect.succeed(
      new InvalidForm({
        competingInterests: Result.fail(new Missing()),
        competingInterestsDetails: Result.succeed(''),
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
    Match.valueTags(competingInterests, {
      Some: competingInterests =>
        new CompletedFormYes({ competingInterests: 'yes', competingInterestsDetails: competingInterests.value }),
      None: () => new CompletedFormNo({ competingInterests: 'no' }),
    }),
  ),
  Match.exhaustive,
)

const CompetingInterestsFieldsSchema = Schema.Struct({
  competingInterests: Schema.Literals(['yes', 'no']),
  competingInterestsDetails: Schema.String,
})
