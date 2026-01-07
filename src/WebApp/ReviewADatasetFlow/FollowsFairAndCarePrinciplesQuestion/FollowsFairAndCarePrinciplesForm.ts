import { UrlParams } from '@effect/platform'
import { Data, Effect, Either, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type FollowsFairAndCarePrinciplesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  followsFairAndCarePrinciples: Either.Either<never, Missing>
  followsFairAndCarePrinciplesYesDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  followsFairAndCarePrinciplesPartlyDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
  followsFairAndCarePrinciplesNoDetail: Either.Either<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  followsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
  followsFairAndCarePrinciplesYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  followsFairAndCarePrinciplesPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  followsFairAndCarePrinciplesNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fn(function* (body: UrlParams.UrlParams) {
  const followsFairAndCarePrinciplesYesDetail = yield* pipe(
    Schema.decode(FollowsFairAndCarePrinciplesYesDetailSchema)(body),
    Effect.andThen(Struct.get('followsFairAndCarePrinciplesYesDetail')),
    Effect.option,
  )
  const followsFairAndCarePrinciplesPartlyDetail = yield* pipe(
    Schema.decode(FollowsFairAndCarePrinciplesPartlyDetailSchema)(body),
    Effect.andThen(Struct.get('followsFairAndCarePrinciplesPartlyDetail')),
    Effect.option,
  )
  const followsFairAndCarePrinciplesNoDetail = yield* pipe(
    Schema.decode(FollowsFairAndCarePrinciplesNoDetailSchema)(body),
    Effect.andThen(Struct.get('followsFairAndCarePrinciplesNoDetail')),
    Effect.option,
  )

  return yield* pipe(
    Schema.decode(FollowsFairAndCarePrinciplesFieldSchema)(body),
    Effect.andThen(
      ({ followsFairAndCarePrinciples }) =>
        new CompletedForm({
          followsFairAndCarePrinciples,
          followsFairAndCarePrinciplesYesDetail,
          followsFairAndCarePrinciplesPartlyDetail,
          followsFairAndCarePrinciplesNoDetail,
        }),
    ),
    Effect.catchTag('ParseError', () =>
      Effect.succeed(
        new InvalidForm({
          followsFairAndCarePrinciples: Either.left(new Missing()),
          followsFairAndCarePrinciplesYesDetail: Either.right(followsFairAndCarePrinciplesYesDetail),
          followsFairAndCarePrinciplesPartlyDetail: Either.right(followsFairAndCarePrinciplesPartlyDetail),
          followsFairAndCarePrinciplesNoDetail: Either.right(followsFairAndCarePrinciplesNoDetail),
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
) => FollowsFairAndCarePrinciplesForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      followsFairAndCarePrinciples: answer,
      followsFairAndCarePrinciplesYesDetail: answer === 'yes' ? detail : Option.none(),
      followsFairAndCarePrinciplesPartlyDetail: answer === 'partly' ? detail : Option.none(),
      followsFairAndCarePrinciplesNoDetail: answer === 'no' ? detail : Option.none(),
    }),
})

const FollowsFairAndCarePrinciplesFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    followsFairAndCarePrinciples: Schema.Literal('yes', 'partly', 'no', 'unsure'),
  }),
)

const FollowsFairAndCarePrinciplesYesDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    followsFairAndCarePrinciplesYesDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const FollowsFairAndCarePrinciplesPartlyDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    followsFairAndCarePrinciplesPartlyDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)

const FollowsFairAndCarePrinciplesNoDetailSchema = UrlParams.schemaRecord(
  Schema.Struct({
    followsFairAndCarePrinciplesNoDetail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
