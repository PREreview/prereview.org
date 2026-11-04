import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type MattersToItsAudienceForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  mattersToItsAudience: Result.Result<never, Missing>
  mattersToItsAudienceVeryConsequentialDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  mattersToItsAudienceSomewhatConsequentialDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  mattersToItsAudienceNotConsequentialDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  mattersToItsAudience: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
  mattersToItsAudienceVeryConsequentialDetail: Option.Option<NonEmptyString.NonEmptyString>
  mattersToItsAudienceSomewhatConsequentialDetail: Option.Option<NonEmptyString.NonEmptyString>
  mattersToItsAudienceNotConsequentialDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fnUntraced(function* (body: UrlParams.UrlParams) {
  const mattersToItsAudienceVeryConsequentialDetail = yield* pipe(
    Schema.decodeEffect(MattersToItsAudienceVeryConsequentialDetailSchema)(body),
    Effect.andThen(flow(Struct.get('mattersToItsAudienceVeryConsequentialDetail'), Effect.fromOption)),
    Effect.option,
  )
  const mattersToItsAudienceSomewhatConsequentialDetail = yield* pipe(
    Schema.decodeEffect(MattersToItsAudienceSomewhatConsequentialDetailSchema)(body),
    Effect.andThen(flow(Struct.get('mattersToItsAudienceSomewhatConsequentialDetail'), Effect.fromOption)),
    Effect.option,
  )
  const mattersToItsAudienceNotConsequentialDetail = yield* pipe(
    Schema.decodeEffect(MattersToItsAudienceNotConsequentialDetailSchema)(body),
    Effect.andThen(flow(Struct.get('mattersToItsAudienceNotConsequentialDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(MattersToItsAudienceSchema)(body),
    Effect.map(
      ({ mattersToItsAudience }) =>
        new CompletedForm({
          mattersToItsAudience,
          mattersToItsAudienceVeryConsequentialDetail,
          mattersToItsAudienceSomewhatConsequentialDetail,
          mattersToItsAudienceNotConsequentialDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          mattersToItsAudience: Result.fail(new Missing()),
          mattersToItsAudienceVeryConsequentialDetail: Result.succeed(mattersToItsAudienceVeryConsequentialDetail),
          mattersToItsAudienceSomewhatConsequentialDetail: Result.succeed(
            mattersToItsAudienceSomewhatConsequentialDetail,
          ),
          mattersToItsAudienceNotConsequentialDetail: Result.succeed(mattersToItsAudienceNotConsequentialDetail),
        }),
      ),
    ),
  )
})

export const fromAnswer: (
  answer: Option.Option<{
    answer: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
    detail: Option.Option<NonEmptyString.NonEmptyString>
  }>,
) => MattersToItsAudienceForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      mattersToItsAudience: answer,
      mattersToItsAudienceVeryConsequentialDetail: answer === 'very-consequential' ? detail : Option.none(),
      mattersToItsAudienceSomewhatConsequentialDetail: answer === 'somewhat-consequential' ? detail : Option.none(),
      mattersToItsAudienceNotConsequentialDetail: answer === 'not-consequential' ? detail : Option.none(),
    }),
})

const MattersToItsAudienceSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      mattersToItsAudience: Schema.Literals([
        'very-consequential',
        'somewhat-consequential',
        'not-consequential',
        'unsure',
      ]),
    }),
  ),
)

const MattersToItsAudienceVeryConsequentialDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      mattersToItsAudienceVeryConsequentialDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const MattersToItsAudienceSomewhatConsequentialDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      mattersToItsAudienceSomewhatConsequentialDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const MattersToItsAudienceNotConsequentialDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      mattersToItsAudienceNotConsequentialDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
