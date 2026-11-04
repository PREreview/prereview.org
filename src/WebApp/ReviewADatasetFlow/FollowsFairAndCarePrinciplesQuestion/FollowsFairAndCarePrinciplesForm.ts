import type { UrlParams } from 'effect/http'
import { Data, Effect, Result, Option, pipe, Schema, Struct, flow } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type FollowsFairAndCarePrinciplesForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  followsFairAndCarePrinciples: Result.Result<never, Missing>
  followsFairAndCarePrinciplesYesDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  followsFairAndCarePrinciplesPartlyDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
  followsFairAndCarePrinciplesNoDetail: Result.Result<Option.Option<NonEmptyString.NonEmptyString>>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  followsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
  followsFairAndCarePrinciplesYesDetail: Option.Option<NonEmptyString.NonEmptyString>
  followsFairAndCarePrinciplesPartlyDetail: Option.Option<NonEmptyString.NonEmptyString>
  followsFairAndCarePrinciplesNoDetail: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = Effect.fnUntraced(function* (body: UrlParams.UrlParams) {
  const followsFairAndCarePrinciplesYesDetail = yield* pipe(
    Schema.decodeEffect(FollowsFairAndCarePrinciplesYesDetailSchema)(body),
    Effect.andThen(flow(Struct.get('followsFairAndCarePrinciplesYesDetail'), Effect.fromOption)),
    Effect.option,
  )
  const followsFairAndCarePrinciplesPartlyDetail = yield* pipe(
    Schema.decodeEffect(FollowsFairAndCarePrinciplesPartlyDetailSchema)(body),
    Effect.andThen(flow(Struct.get('followsFairAndCarePrinciplesPartlyDetail'), Effect.fromOption)),
    Effect.option,
  )
  const followsFairAndCarePrinciplesNoDetail = yield* pipe(
    Schema.decodeEffect(FollowsFairAndCarePrinciplesNoDetailSchema)(body),
    Effect.andThen(flow(Struct.get('followsFairAndCarePrinciplesNoDetail'), Effect.fromOption)),
    Effect.option,
  )

  return yield* pipe(
    Schema.decodeEffect(FollowsFairAndCarePrinciplesFieldSchema)(body),
    Effect.map(
      ({ followsFairAndCarePrinciples }) =>
        new CompletedForm({
          followsFairAndCarePrinciples,
          followsFairAndCarePrinciplesYesDetail,
          followsFairAndCarePrinciplesPartlyDetail,
          followsFairAndCarePrinciplesNoDetail,
        }),
    ),
    Effect.catchTag('SchemaError', () =>
      Effect.succeed(
        new InvalidForm({
          followsFairAndCarePrinciples: Result.fail(new Missing()),
          followsFairAndCarePrinciplesYesDetail: Result.succeed(followsFairAndCarePrinciplesYesDetail),
          followsFairAndCarePrinciplesPartlyDetail: Result.succeed(followsFairAndCarePrinciplesPartlyDetail),
          followsFairAndCarePrinciplesNoDetail: Result.succeed(followsFairAndCarePrinciplesNoDetail),
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

const FollowsFairAndCarePrinciplesFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      followsFairAndCarePrinciples: Schema.Literals(['yes', 'partly', 'no', 'unsure']),
    }),
  ),
)

const FollowsFairAndCarePrinciplesYesDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      followsFairAndCarePrinciplesYesDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const FollowsFairAndCarePrinciplesPartlyDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      followsFairAndCarePrinciplesPartlyDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)

const FollowsFairAndCarePrinciplesNoDetailSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      followsFairAndCarePrinciplesNoDetail: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
