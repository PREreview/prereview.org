import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type SupportsRelatedConclusionsForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  supportsRelatedConclusions: Result.Result<never, Missing>
  supportsRelatedConclusionsYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  supportsRelatedConclusionsPartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  supportsRelatedConclusionsNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  supportsRelatedConclusions: 'yes' | 'partly' | 'no' | 'unsure'
  supportsRelatedConclusionsYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  supportsRelatedConclusionsPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  supportsRelatedConclusionsNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const supportsRelatedConclusionsYesDetail = yield* pipe(
    Schema.decodeEffect(SupportsRelatedConclusionsYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('supportsRelatedConclusionsYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const supportsRelatedConclusionsPartlyDetail = yield* pipe(
    Schema.decodeEffect(SupportsRelatedConclusionsPartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('supportsRelatedConclusionsPartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const supportsRelatedConclusionsNoDetail = yield* pipe(
    Schema.decodeEffect(SupportsRelatedConclusionsNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('supportsRelatedConclusionsNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(SupportsRelatedConclusionsSchema)(body),
    Effect.map(
      ({ supportsRelatedConclusions }) =>
        new CompletedForm({
          supportsRelatedConclusions,
          supportsRelatedConclusionsYesDetail,
          supportsRelatedConclusionsPartlyDetail,
          supportsRelatedConclusionsNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          supportsRelatedConclusions: Result.fail(new Missing()),
          supportsRelatedConclusionsYesDetail: Result.succeed(supportsRelatedConclusionsYesDetail),
          supportsRelatedConclusionsPartlyDetail: Result.succeed(supportsRelatedConclusionsPartlyDetail),
          supportsRelatedConclusionsNoDetail: Result.succeed(supportsRelatedConclusionsNoDetail),
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

const SupportsRelatedConclusionsSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      supportsRelatedConclusions: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const SupportsRelatedConclusionsYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      supportsRelatedConclusionsYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const SupportsRelatedConclusionsPartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      supportsRelatedConclusionsPartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const SupportsRelatedConclusionsNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      supportsRelatedConclusionsNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
