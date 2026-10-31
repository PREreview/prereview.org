import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type HasTrackedChangesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasTrackedChanges: Result.Result<never, Missing>
  hasTrackedChangesYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  hasTrackedChangesPartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  hasTrackedChangesNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasTrackedChanges: 'yes' | 'partly' | 'no' | 'unsure'
  hasTrackedChangesYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasTrackedChangesPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasTrackedChangesNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const hasTrackedChangesYesDetail = yield* pipe(
    Schema.decodeEffect(HasTrackedChangesYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasTrackedChangesYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const hasTrackedChangesPartlyDetail = yield* pipe(
    Schema.decodeEffect(HasTrackedChangesPartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasTrackedChangesPartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const hasTrackedChangesNoDetail = yield* pipe(
    Schema.decodeEffect(HasTrackedChangesNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasTrackedChangesNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(HasTrackedChangesFieldSchema)(body),
    Effect.map(
      ({ hasTrackedChanges }) =>
        new CompletedForm({
          hasTrackedChanges,
          hasTrackedChangesYesDetail,
          hasTrackedChangesPartlyDetail,
          hasTrackedChangesNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          hasTrackedChanges: Result.fail(new Missing()),
          hasTrackedChangesYesDetail: Result.succeed(hasTrackedChangesYesDetail),
          hasTrackedChangesPartlyDetail: Result.succeed(hasTrackedChangesPartlyDetail),
          hasTrackedChangesNoDetail: Result.succeed(hasTrackedChangesNoDetail),
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
) => HasTrackedChangesForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      hasTrackedChanges: answer,
      hasTrackedChangesYesDetail: answer === 'yes' ? detail : Option.none(),
      hasTrackedChangesPartlyDetail: answer === 'partly' ? detail : Option.none(),
      hasTrackedChangesNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const HasTrackedChangesFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasTrackedChanges: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const HasTrackedChangesYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasTrackedChangesYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const HasTrackedChangesPartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasTrackedChangesPartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const HasTrackedChangesNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasTrackedChangesNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
