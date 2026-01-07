import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type SupportsRelatedConclusionsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  supportsRelatedConclusions: Either.Either<never, Missing>
  supportsRelatedConclusionsYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  supportsRelatedConclusionsPartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  supportsRelatedConclusionsNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  supportsRelatedConclusions: 'yes' | 'partly' | 'no' | 'unsure'
  supportsRelatedConclusionsYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  supportsRelatedConclusionsPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  supportsRelatedConclusionsNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const supportsRelatedConclusionsYesDetail = yield* pipe(
    Schema.decode(SupportsRelatedConclusionsYesDetailSchema)(body),
    Effect.andThen(Struct.get('supportsRelatedConclusionsYesDetail')),
    Effect.option,
  )
  const supportsRelatedConclusionsPartlyDetail = yield* pipe(
    Schema.decode(SupportsRelatedConclusionsPartlyDetailSchema)(body),
    Effect.andThen(Struct.get('supportsRelatedConclusionsPartlyDetail')),
    Effect.option,
  )
  const supportsRelatedConclusionsNoDetail = yield* pipe(
    Schema.decode(SupportsRelatedConclusionsNoDetailSchema)(body),
    Effect.andThen(Struct.get('supportsRelatedConclusionsNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(SupportsRelatedConclusionsSchema)(body),
    Effect.andThen(
      ({ supportsRelatedConclusions }) =>
        new CompletedForm({
          supportsRelatedConclusions,
          supportsRelatedConclusionsYesDetail,
          supportsRelatedConclusionsPartlyDetail,
          supportsRelatedConclusionsNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          supportsRelatedConclusions: Either.left(new Missing()),
          supportsRelatedConclusionsYesDetail: Either.right(supportsRelatedConclusionsYesDetail),
          supportsRelatedConclusionsPartlyDetail: Either.right(supportsRelatedConclusionsPartlyDetail),
          supportsRelatedConclusionsNoDetail: Either.right(supportsRelatedConclusionsNoDetail),
        }),
      ),
    ),
  )
})

export const fromAnswer: (
  answer: Option.Option<{
    answer: 'yes' | 'partly' | 'no' | 'unsure'
    detail: Option.Option<NonEmptyString.NonEmptyString>
  }>,
) => SupportsRelatedConclusionsForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      supportsRelatedConclusions: answer,
      supportsRelatedConclusionsYesDetail: answer === 'yes' ? detail : Option.none(),
      supportsRelatedConclusionsPartlyDetail: answer === 'partly' ? detail : Option.none(),
      supportsRelatedConclusionsNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const SupportsRelatedConclusionsSchema = UrlParams.schemaRecord(
  Schema.Struct({
    supportsRelatedConclusions: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const SupportsRelatedConclusionsYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    supportsRelatedConclusionsYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const SupportsRelatedConclusionsPartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    supportsRelatedConclusionsPartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const SupportsRelatedConclusionsNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    supportsRelatedConclusionsNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
