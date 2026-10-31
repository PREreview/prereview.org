import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type IsReadyToBeSharedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isReadyToBeShared: Result.Result<never, Missing>
  isReadyToBeSharedYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  isReadyToBeSharedNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isReadyToBeShared: 'yes' | 'no' | 'unsure'
  isReadyToBeSharedYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isReadyToBeSharedNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const isReadyToBeSharedYesDetail = yield* pipe(
    Schema.decodeEffect(IsReadyToBeSharedYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isReadyToBeSharedYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const isReadyToBeSharedNoDetail = yield* pipe(
    Schema.decodeEffect(IsReadyToBeSharedNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isReadyToBeSharedNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(IsReadyToBeSharedSchema)(body),
    Effect.map(
      ({ isReadyToBeShared }) =>
        new CompletedForm({
          isReadyToBeShared,
          isReadyToBeSharedYesDetail,
          isReadyToBeSharedNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          isReadyToBeShared: Result.fail(new Missing()),
          isReadyToBeSharedYesDetail: Result.succeed(isReadyToBeSharedYesDetail),
          isReadyToBeSharedNoDetail: Result.succeed(isReadyToBeSharedNoDetail),
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

const IsReadyToBeSharedSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isReadyToBeShared: Schema.Literals(['yes', 'no', 'unsure']),
    }),
  ),
)

const IsReadyToBeSharedYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isReadyToBeSharedYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const IsReadyToBeSharedNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isReadyToBeSharedNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
