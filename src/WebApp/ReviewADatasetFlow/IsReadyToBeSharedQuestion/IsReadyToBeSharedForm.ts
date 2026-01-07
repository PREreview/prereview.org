import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type IsReadyToBeSharedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isReadyToBeShared: Either.Either<never, Missing>
  isReadyToBeSharedYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  isReadyToBeSharedNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isReadyToBeShared: 'yes' | 'no' | 'unsure'
  isReadyToBeSharedYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isReadyToBeSharedNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const isReadyToBeSharedYesDetail = yield* pipe(
    Schema.decode(IsReadyToBeSharedYesDetailSchema)(body),
    Effect.andThen(Struct.get('isReadyToBeSharedYesDetail')),
    Effect.option,
  )
  const isReadyToBeSharedNoDetail = yield* pipe(
    Schema.decode(IsReadyToBeSharedNoDetailSchema)(body),
    Effect.andThen(Struct.get('isReadyToBeSharedNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(IsReadyToBeSharedSchema)(body),
    Effect.andThen(
      ({ isReadyToBeShared }) =>
        new CompletedForm({
          isReadyToBeShared,
          isReadyToBeSharedYesDetail,
          isReadyToBeSharedNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          isReadyToBeShared: Either.left(new Missing()),
          isReadyToBeSharedYesDetail: Either.right(isReadyToBeSharedYesDetail),
          isReadyToBeSharedNoDetail: Either.right(isReadyToBeSharedNoDetail),
        }),
      ),
    ),
  )
})

export const fromAnswer: (
  answer: Option.Option<{
    answer: 'yes' | 'no' | 'unsure'
    detail: Option.Option<NonEmptyString.NonEmptyString>
  }>,
) => IsReadyToBeSharedForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      isReadyToBeShared: answer,
      isReadyToBeSharedYesDetail: answer === 'yes' ? detail : Option.none(),
      isReadyToBeSharedNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const IsReadyToBeSharedSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isReadyToBeShared: Schema.Literal('yes', 'no', 'unsure'),
  }),
)

const IsReadyToBeSharedYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isReadyToBeSharedYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const IsReadyToBeSharedNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isReadyToBeSharedNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
