import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type IsDetailedEnoughForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isDetailedEnough: Result.Result<never, Missing>
  isDetailedEnoughYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  isDetailedEnoughPartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  isDetailedEnoughNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isDetailedEnough: 'yes' | 'partly' | 'no' | 'unsure'
  isDetailedEnoughYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isDetailedEnoughPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  isDetailedEnoughNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const isDetailedEnoughYesDetail = yield* pipe(
    Schema.decodeEffect(IsDetailedEnoughYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isDetailedEnoughYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const isDetailedEnoughPartlyDetail = yield* pipe(
    Schema.decodeEffect(IsDetailedEnoughPartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isDetailedEnoughPartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const isDetailedEnoughNoDetail = yield* pipe(
    Schema.decodeEffect(IsDetailedEnoughNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isDetailedEnoughNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(IsDetailedEnoughSchema)(body),
    Effect.map(
      ({ isDetailedEnough }) =>
        new CompletedForm({
          isDetailedEnough,
          isDetailedEnoughYesDetail,
          isDetailedEnoughPartlyDetail,
          isDetailedEnoughNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          isDetailedEnough: Result.fail(new Missing()),
          isDetailedEnoughYesDetail: Result.succeed(isDetailedEnoughYesDetail),
          isDetailedEnoughPartlyDetail: Result.succeed(isDetailedEnoughPartlyDetail),
          isDetailedEnoughNoDetail: Result.succeed(isDetailedEnoughNoDetail),
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
) => IsDetailedEnoughForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      isDetailedEnough: answer,
      isDetailedEnoughYesDetail: answer === 'yes' ? detail : Option.none(),
      isDetailedEnoughPartlyDetail: answer === 'partly' ? detail : Option.none(),
      isDetailedEnoughNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const IsDetailedEnoughSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isDetailedEnough: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const IsDetailedEnoughYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isDetailedEnoughYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const IsDetailedEnoughPartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isDetailedEnoughPartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const IsDetailedEnoughNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isDetailedEnoughNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
