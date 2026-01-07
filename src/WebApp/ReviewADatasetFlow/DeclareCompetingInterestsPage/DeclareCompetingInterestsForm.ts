import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type DeclareCompetingInterestsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  declareCompetingInterests: Either.Either<'yes', Missing>
  competingInterestsDetails: Either.Either<void, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  declareCompetingInterests: 'yes' | 'no'
  competingInterestsDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { declareCompetingInterests } = yield* Schema.decode(DeclareCompetingInterestsFieldSchema)(body)

    if (declareCompetingInterests === 'no') {
      return new CompletedForm({ declareCompetingInterests, competingInterestsDetails: Option.none() })
    }

    return yield* pipe(
      Effect.gen(function* () {
        const { competingInterestsDetails } = yield* Schema.decode(CompetingInterestsDetailsFieldSchema)(body)

        return new CompletedForm({
          declareCompetingInterests: 'yes',
          competingInterestsDetails: Option.some(competingInterestsDetails),
        })
      }),
      Effect.catchTag('ParseError', () =>
        Effect.succeed(
          new InvalidForm({
            declareCompetingInterests: Either.right('yes'),
            competingInterestsDetails: Either.left(new Missing()),
          }),
        ),
      ),
    )
  },
  Effect.catchTag('ParseError', () =>
    Effect.succeed(
      new InvalidForm({
        declareCompetingInterests: Either.left(new Missing()),
        competingInterestsDetails: Either.void,
      }),
    ),
  ),
)

export const fromCompetingInterests: (
  competingInterests: Option.Option<Option.Option<NonEmptyString.NonEmptyString>>,
) => DeclareCompetingInterestsForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: Option.match({
    onNone: () => new CompletedForm({ declareCompetingInterests: 'no', competingInterestsDetails: Option.none() }),
    onSome: competingInterests =>
      new CompletedForm({
        declareCompetingInterests: 'yes',
        competingInterestsDetails: Option.some(competingInterests),
      }),
  }),
})

const DeclareCompetingInterestsFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    declareCompetingInterests: Schema.Literal('yes', 'no'),
  }),
)

const CompetingInterestsDetailsFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    competingInterestsDetails: NonEmptyString.NonEmptyStringSchema,
  }),
)
