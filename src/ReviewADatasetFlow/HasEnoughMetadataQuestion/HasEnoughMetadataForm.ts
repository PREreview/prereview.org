import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../types/index.ts'

export type HasEnoughMetadataForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasEnoughMetadata: Either.Either<never, Missing>
  hasEnoughMetadataYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  hasEnoughMetadataPartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  hasEnoughMetadataNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasEnoughMetadata: 'yes' | 'partly' | 'no' | 'unsure'
  hasEnoughMetadataYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasEnoughMetadataPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasEnoughMetadataNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const hasEnoughMetadataYesDetail = yield* pipe(
    Schema.decode(HasEnoughMetadataYesDetailSchema)(body),
    Effect.andThen(Struct.get('hasEnoughMetadataYesDetail')),
    Effect.option,
  )
  const hasEnoughMetadataPartlyDetail = yield* pipe(
    Schema.decode(HasEnoughMetadataPartlyDetailSchema)(body),
    Effect.andThen(Struct.get('hasEnoughMetadataPartlyDetail')),
    Effect.option,
  )
  const hasEnoughMetadataNoDetail = yield* pipe(
    Schema.decode(HasEnoughMetadataNoDetailSchema)(body),
    Effect.andThen(Struct.get('hasEnoughMetadataNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(HasEnoughMetadataFieldSchema)(body),
    Effect.andThen(
      ({ hasEnoughMetadata }) =>
        new CompletedForm({
          hasEnoughMetadata,
          hasEnoughMetadataYesDetail,
          hasEnoughMetadataPartlyDetail,
          hasEnoughMetadataNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          hasEnoughMetadata: Either.left(new Missing()),
          hasEnoughMetadataYesDetail: Either.right(hasEnoughMetadataYesDetail),
          hasEnoughMetadataPartlyDetail: Either.right(hasEnoughMetadataPartlyDetail),
          hasEnoughMetadataNoDetail: Either.right(hasEnoughMetadataNoDetail),
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
) => HasEnoughMetadataForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      hasEnoughMetadata: answer,
      hasEnoughMetadataYesDetail: answer === 'yes' ? detail : Option.none(),
      hasEnoughMetadataPartlyDetail: answer === 'partly' ? detail : Option.none(),
      hasEnoughMetadataNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const HasEnoughMetadataFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasEnoughMetadata: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const HasEnoughMetadataYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasEnoughMetadataYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const HasEnoughMetadataPartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasEnoughMetadataPartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const HasEnoughMetadataNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasEnoughMetadataNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
