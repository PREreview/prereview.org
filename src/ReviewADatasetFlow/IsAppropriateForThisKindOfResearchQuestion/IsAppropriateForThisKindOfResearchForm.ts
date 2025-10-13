import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../types/index.ts'

export type IsAppropriateForThisKindOfResearchForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  isAppropriateForThisKindOfResearch: Either.Either<never, Missing>
  isAppropriateForThisKindOfResearchYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  isAppropriateForThisKindOfResearchPartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  isAppropriateForThisKindOfResearchNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  isAppropriateForThisKindOfResearch: 'yes' | 'partly' | 'no' | 'unsure'
  isAppropriateForThisKindOfResearchYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  isAppropriateForThisKindOfResearchPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  isAppropriateForThisKindOfResearchNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const isAppropriateForThisKindOfResearchYesDetail = yield* pipe(
    Schema.decode(IsAppropriateForThisKindOfResearchYesDetailSchema)(body),
    Effect.andThen(Struct.get('isAppropriateForThisKindOfResearchYesDetail')),
    Effect.option,
  )
  const isAppropriateForThisKindOfResearchPartlyDetail = yield* pipe(
    Schema.decode(IsAppropriateForThisKindOfResearchPartlyDetailSchema)(body),
    Effect.andThen(Struct.get('isAppropriateForThisKindOfResearchPartlyDetail')),
    Effect.option,
  )
  const isAppropriateForThisKindOfResearchNoDetail = yield* pipe(
    Schema.decode(IsAppropriateForThisKindOfResearchNoDetailSchema)(body),
    Effect.andThen(Struct.get('isAppropriateForThisKindOfResearchNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(IsAppropriateForThisKindOfResearchSchema)(body),
    Effect.andThen(
      ({ isAppropriateForThisKindOfResearch }) =>
        new CompletedForm({
          isAppropriateForThisKindOfResearch,
          isAppropriateForThisKindOfResearchYesDetail,
          isAppropriateForThisKindOfResearchPartlyDetail,
          isAppropriateForThisKindOfResearchNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          isAppropriateForThisKindOfResearch: Either.left(new Missing()),
          isAppropriateForThisKindOfResearchYesDetail: Either.right(isAppropriateForThisKindOfResearchYesDetail),
          isAppropriateForThisKindOfResearchPartlyDetail: Either.right(isAppropriateForThisKindOfResearchPartlyDetail),
          isAppropriateForThisKindOfResearchNoDetail: Either.right(isAppropriateForThisKindOfResearchNoDetail),
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

const IsAppropriateForThisKindOfResearchSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isAppropriateForThisKindOfResearch: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const IsAppropriateForThisKindOfResearchYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isAppropriateForThisKindOfResearchYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const IsAppropriateForThisKindOfResearchPartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isAppropriateForThisKindOfResearchPartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const IsAppropriateForThisKindOfResearchNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    isAppropriateForThisKindOfResearchNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
