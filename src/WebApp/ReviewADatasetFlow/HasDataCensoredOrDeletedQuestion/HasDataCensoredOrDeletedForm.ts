import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type HasDataCensoredOrDeletedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasDataCensoredOrDeleted: Result.Result<never, Missing>
  hasDataCensoredOrDeletedYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  hasDataCensoredOrDeletedPartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  hasDataCensoredOrDeletedNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasDataCensoredOrDeleted: 'yes' | 'partly' | 'no' | 'unsure'
  hasDataCensoredOrDeletedYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasDataCensoredOrDeletedPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasDataCensoredOrDeletedNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const hasDataCensoredOrDeletedYesDetail = yield* pipe(
    Schema.decodeEffect(HasDataCensoredOrDeletedYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasDataCensoredOrDeletedYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const hasDataCensoredOrDeletedPartlyDetail = yield* pipe(
    Schema.decodeEffect(HasDataCensoredOrDeletedPartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasDataCensoredOrDeletedPartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const hasDataCensoredOrDeletedNoDetail = yield* pipe(
    Schema.decodeEffect(HasDataCensoredOrDeletedNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasDataCensoredOrDeletedNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(HasDataCensoredOrDeletedSchema)(body),
    Effect.map(
      ({ hasDataCensoredOrDeleted }) =>
        new CompletedForm({
          hasDataCensoredOrDeleted,
          hasDataCensoredOrDeletedYesDetail,
          hasDataCensoredOrDeletedPartlyDetail,
          hasDataCensoredOrDeletedNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          hasDataCensoredOrDeleted: Result.fail(new Missing()),
          hasDataCensoredOrDeletedYesDetail: Result.succeed(hasDataCensoredOrDeletedYesDetail),
          hasDataCensoredOrDeletedPartlyDetail: Result.succeed(hasDataCensoredOrDeletedPartlyDetail),
          hasDataCensoredOrDeletedNoDetail: Result.succeed(hasDataCensoredOrDeletedNoDetail),
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
) => HasDataCensoredOrDeletedForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      hasDataCensoredOrDeleted: answer,
      hasDataCensoredOrDeletedYesDetail: answer === 'yes' ? detail : Option.none(),
      hasDataCensoredOrDeletedPartlyDetail: answer === 'partly' ? detail : Option.none(),
      hasDataCensoredOrDeletedNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const HasDataCensoredOrDeletedSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasDataCensoredOrDeleted: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const HasDataCensoredOrDeletedYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasDataCensoredOrDeletedYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const HasDataCensoredOrDeletedPartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasDataCensoredOrDeletedPartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const HasDataCensoredOrDeletedNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasDataCensoredOrDeletedNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
