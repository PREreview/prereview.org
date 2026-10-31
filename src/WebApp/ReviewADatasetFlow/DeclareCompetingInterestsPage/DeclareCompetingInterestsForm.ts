import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type DeclareCompetingInterestsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  declareCompetingInterests: Result.Result<'yes', Missing>
  competingInterestsDetails: Result.Result<void, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  declareCompetingInterests: 'yes' | 'no'
  competingInterestsDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(
  function* (body: UrlParams.UrlParams) {
    const { declareCompetingInterests } = yield* Schema.decodeEffect(DeclareCompetingInterestsFieldSchema)(body)

    if (declareCompetingInterests === 'no') {
      return new CompletedForm({ declareCompetingInterests, competingInterestsDetails: Option.none() })
    }

    return yield* pipe(
      Effect.gen(function* () {
        const { competingInterestsDetails } = yield* Schema.decodeEffect(CompetingInterestsDetailsFieldSchema)(body)

        return new CompletedForm({
          declareCompetingInterests: 'yes',
          competingInterestsDetails: Option.some(competingInterestsDetails),
        })
      }),
      Effect.catchTag('SchemaError', () =>
        Effect.succeed(
          new InvalidForm({
            declareCompetingInterests: Result.succeed('yes'),
            competingInterestsDetails: Result.fail(new Missing()),
          }),
        ),
      ),
    )
  },
  Effect.catchTag('SchemaError', () =>
    Effect.succeed(
      new InvalidForm({
        declareCompetingInterests: Result.fail(new Missing()),
        competingInterestsDetails: Result.void,
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

const DeclareCompetingInterestsFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      declareCompetingInterests: Schema.Literals(['yes', 'no']),
    }),
  ),
)

const CompetingInterestsDetailsFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      competingInterestsDetails: NonEmptyString.NonEmptyStringSchema,
    }),
  ),
)
