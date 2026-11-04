import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type HasEnoughMetadataForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasEnoughMetadata: Result.Result<never, Missing>
  hasEnoughMetadataYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  hasEnoughMetadataPartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  hasEnoughMetadataNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasEnoughMetadata: 'yes' | 'partly' | 'no' | 'unsure'
  hasEnoughMetadataYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasEnoughMetadataPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasEnoughMetadataNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fnUntraced(function* (body: UrlParams.UrlParams) {
  const hasEnoughMetadataYesDetail = yield* pipe(
    Schema.decodeEffect(HasEnoughMetadataYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasEnoughMetadataYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const hasEnoughMetadataPartlyDetail = yield* pipe(
    Schema.decodeEffect(HasEnoughMetadataPartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasEnoughMetadataPartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const hasEnoughMetadataNoDetail = yield* pipe(
    Schema.decodeEffect(HasEnoughMetadataNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('hasEnoughMetadataNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(HasEnoughMetadataFieldSchema)(body),
    Effect.map(
      ({ hasEnoughMetadata }) =>
        new CompletedForm({
          hasEnoughMetadata,
          hasEnoughMetadataYesDetail,
          hasEnoughMetadataPartlyDetail,
          hasEnoughMetadataNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          hasEnoughMetadata: Result.fail(new Missing()),
          hasEnoughMetadataYesDetail: Result.succeed(hasEnoughMetadataYesDetail),
          hasEnoughMetadataPartlyDetail: Result.succeed(hasEnoughMetadataPartlyDetail),
          hasEnoughMetadataNoDetail: Result.succeed(hasEnoughMetadataNoDetail),
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

const HasEnoughMetadataFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasEnoughMetadata: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const HasEnoughMetadataYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasEnoughMetadataYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const HasEnoughMetadataPartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasEnoughMetadataPartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const HasEnoughMetadataNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      hasEnoughMetadataNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
