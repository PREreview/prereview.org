import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../types/index.ts'

export type HasDataCensoredOrDeletedForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  hasDataCensoredOrDeleted: Either.Either<never, Missing>
  hasDataCensoredOrDeletedYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  hasDataCensoredOrDeletedPartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  hasDataCensoredOrDeletedNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  hasDataCensoredOrDeleted: 'yes' | 'partly' | 'no' | 'unsure'
  hasDataCensoredOrDeletedYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasDataCensoredOrDeletedPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  hasDataCensoredOrDeletedNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const hasDataCensoredOrDeletedYesDetail = yield* pipe(
    Schema.decode(HasDataCensoredOrDeletedYesDetailSchema)(body),
    Effect.andThen(Struct.get('hasDataCensoredOrDeletedYesDetail')),
    Effect.option,
  )
  const hasDataCensoredOrDeletedPartlyDetail = yield* pipe(
    Schema.decode(HasDataCensoredOrDeletedPartlyDetailSchema)(body),
    Effect.andThen(Struct.get('hasDataCensoredOrDeletedPartlyDetail')),
    Effect.option,
  )
  const hasDataCensoredOrDeletedNoDetail = yield* pipe(
    Schema.decode(HasDataCensoredOrDeletedNoDetailSchema)(body),
    Effect.andThen(Struct.get('hasDataCensoredOrDeletedNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(HasDataCensoredOrDeletedSchema)(body),
    Effect.andThen(
      ({ hasDataCensoredOrDeleted }) =>
        new CompletedForm({
          hasDataCensoredOrDeleted,
          hasDataCensoredOrDeletedYesDetail,
          hasDataCensoredOrDeletedPartlyDetail,
          hasDataCensoredOrDeletedNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          hasDataCensoredOrDeleted: Either.left(new Missing()),
          hasDataCensoredOrDeletedYesDetail: Either.right(hasDataCensoredOrDeletedYesDetail),
          hasDataCensoredOrDeletedPartlyDetail: Either.right(hasDataCensoredOrDeletedPartlyDetail),
          hasDataCensoredOrDeletedNoDetail: Either.right(hasDataCensoredOrDeletedNoDetail),
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

const HasDataCensoredOrDeletedSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasDataCensoredOrDeleted: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const HasDataCensoredOrDeletedYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasDataCensoredOrDeletedYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const HasDataCensoredOrDeletedPartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasDataCensoredOrDeletedPartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const HasDataCensoredOrDeletedNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    hasDataCensoredOrDeletedNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
