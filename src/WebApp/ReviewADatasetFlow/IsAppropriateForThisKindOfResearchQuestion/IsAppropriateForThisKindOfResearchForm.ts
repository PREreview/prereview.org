import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type IsAppropriateForThisKindOfResearchForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isAppropriateForThisKindOfResearch: Result.Result<never, Missing>
  isAppropriateForThisKindOfResearchYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  isAppropriateForThisKindOfResearchPartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  isAppropriateForThisKindOfResearchNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isAppropriateForThisKindOfResearch: 'yes' | 'partly' | 'no' | 'unsure'
  isAppropriateForThisKindOfResearchYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isAppropriateForThisKindOfResearchPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  isAppropriateForThisKindOfResearchNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fnUntraced(function* (body: UrlParams.UrlParams) {
  const isAppropriateForThisKindOfResearchYesDetail = yield* pipe(
    Schema.decodeEffect(IsAppropriateForThisKindOfResearchYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isAppropriateForThisKindOfResearchYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const isAppropriateForThisKindOfResearchPartlyDetail = yield* pipe(
    Schema.decodeEffect(IsAppropriateForThisKindOfResearchPartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isAppropriateForThisKindOfResearchPartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const isAppropriateForThisKindOfResearchNoDetail = yield* pipe(
    Schema.decodeEffect(IsAppropriateForThisKindOfResearchNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('isAppropriateForThisKindOfResearchNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(IsAppropriateForThisKindOfResearchSchema)(body),
    Effect.map(
      ({ isAppropriateForThisKindOfResearch }) =>
        new CompletedForm({
          isAppropriateForThisKindOfResearch,
          isAppropriateForThisKindOfResearchYesDetail,
          isAppropriateForThisKindOfResearchPartlyDetail,
          isAppropriateForThisKindOfResearchNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          isAppropriateForThisKindOfResearch: Result.fail(new Missing()),
          isAppropriateForThisKindOfResearchYesDetail: Result.succeed(isAppropriateForThisKindOfResearchYesDetail),
          isAppropriateForThisKindOfResearchPartlyDetail: Result.succeed(
            isAppropriateForThisKindOfResearchPartlyDetail,
          ),
          isAppropriateForThisKindOfResearchNoDetail: Result.succeed(isAppropriateForThisKindOfResearchNoDetail),
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
) => IsAppropriateForThisKindOfResearchForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      isAppropriateForThisKindOfResearch: answer,
      isAppropriateForThisKindOfResearchYesDetail: answer === 'yes' ? detail : Option.none(),
      isAppropriateForThisKindOfResearchPartlyDetail: answer === 'partly' ? detail : Option.none(),
      isAppropriateForThisKindOfResearchNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const IsAppropriateForThisKindOfResearchSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isAppropriateForThisKindOfResearch: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const IsAppropriateForThisKindOfResearchYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isAppropriateForThisKindOfResearchYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const IsAppropriateForThisKindOfResearchPartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isAppropriateForThisKindOfResearchPartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const IsAppropriateForThisKindOfResearchNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      isAppropriateForThisKindOfResearchNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
