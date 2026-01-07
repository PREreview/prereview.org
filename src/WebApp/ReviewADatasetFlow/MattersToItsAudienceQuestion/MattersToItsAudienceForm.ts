import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type MattersToItsAudienceForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  mattersToItsAudience: Either.Either<never, Missing>
  mattersToItsAudienceVeryConsequentialDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  mattersToItsAudienceSomewhatConsequentialDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  mattersToItsAudienceNotConsequentialDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  mattersToItsAudience: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
  mattersToItsAudienceVeryConsequentialDetail: Option.Option<NonEmptyString.NonEmptyString>
  mattersToItsAudienceSomewhatConsequentialDetail: Option.Option<NonEmptyString.NonEmptyString>
  mattersToItsAudienceNotConsequentialDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const mattersToItsAudienceVeryConsequentialDetail = yield* pipe(
    Schema.decode(MattersToItsAudienceVeryConsequentialDetailSchema)(body),
    Effect.andThen(Struct.get('mattersToItsAudienceVeryConsequentialDetail')),
    Effect.option,
  )
  const mattersToItsAudienceSomewhatConsequentialDetail = yield* pipe(
    Schema.decode(MattersToItsAudienceSomewhatConsequentialDetailSchema)(body),
    Effect.andThen(Struct.get('mattersToItsAudienceSomewhatConsequentialDetail')),
    Effect.option,
  )
  const mattersToItsAudienceNotConsequentialDetail = yield* pipe(
    Schema.decode(MattersToItsAudienceNotConsequentialDetailSchema)(body),
    Effect.andThen(Struct.get('mattersToItsAudienceNotConsequentialDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(MattersToItsAudienceSchema)(body),
    Effect.andThen(
      ({ mattersToItsAudience }) =>
        new CompletedForm({
          mattersToItsAudience,
          mattersToItsAudienceVeryConsequentialDetail,
          mattersToItsAudienceSomewhatConsequentialDetail,
          mattersToItsAudienceNotConsequentialDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          mattersToItsAudience: Either.left(new Missing()),
          mattersToItsAudienceVeryConsequentialDetail: Either.right(mattersToItsAudienceVeryConsequentialDetail),
          mattersToItsAudienceSomewhatConsequentialDetail: Either.right(
            mattersToItsAudienceSomewhatConsequentialDetail,
          ),
          mattersToItsAudienceNotConsequentialDetail: Either.right(mattersToItsAudienceNotConsequentialDetail),
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

const MattersToItsAudienceSchema = UrlParams.schemaRecord(
  Schema.Struct({
    mattersToItsAudience: Schema.Literal('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
  }),
)

const MattersToItsAudienceVeryConsequentialDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    mattersToItsAudienceVeryConsequentialDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const MattersToItsAudienceSomewhatConsequentialDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    mattersToItsAudienceSomewhatConsequentialDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const MattersToItsAudienceNotConsequentialDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    mattersToItsAudienceNotConsequentialDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
