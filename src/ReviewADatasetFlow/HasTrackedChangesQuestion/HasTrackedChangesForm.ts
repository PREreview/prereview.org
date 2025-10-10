import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../types/index.ts'

export type HasTrackedChangesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasTrackedChanges: Either.Either<never, Missing>
  hasTrackedChangesYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  hasTrackedChangesPartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  hasTrackedChangesNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasTrackedChanges: 'yes' | 'partly' | 'no' | 'unsure'
  hasTrackedChangesYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasTrackedChangesPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasTrackedChangesNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const hasTrackedChangesYesDetail = yield* pipe(
    Schema.decode(HasTrackedChangesYesDetailSchema)(body),
    Effect.andThen(Struct.get('hasTrackedChangesYesDetail')),
    Effect.option,
  )
  const hasTrackedChangesPartlyDetail = yield* pipe(
    Schema.decode(HasTrackedChangesPartlyDetailSchema)(body),
    Effect.andThen(Struct.get('hasTrackedChangesPartlyDetail')),
    Effect.option,
  )
  const hasTrackedChangesNoDetail = yield* pipe(
    Schema.decode(HasTrackedChangesNoDetailSchema)(body),
    Effect.andThen(Struct.get('hasTrackedChangesNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(HasTrackedChangesFieldSchema)(body),
    Effect.andThen(
      ({ hasTrackedChanges }) =>
        new CompletedForm({
          hasTrackedChanges,
          hasTrackedChangesYesDetail,
          hasTrackedChangesPartlyDetail,
          hasTrackedChangesNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          hasTrackedChanges: Either.left(new Missing()),
          hasTrackedChangesYesDetail: Either.right(hasTrackedChangesYesDetail),
          hasTrackedChangesPartlyDetail: Either.right(hasTrackedChangesPartlyDetail),
          hasTrackedChangesNoDetail: Either.right(hasTrackedChangesNoDetail),
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

const HasTrackedChangesFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasTrackedChanges: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const HasTrackedChangesYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasTrackedChangesYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const HasTrackedChangesPartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasTrackedChangesPartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const HasTrackedChangesNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasTrackedChangesNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
