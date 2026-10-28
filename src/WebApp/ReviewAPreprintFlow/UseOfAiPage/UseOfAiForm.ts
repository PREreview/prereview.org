import { UrlParams } from '@effect/platform'
import { Data, Either, Match, Option, pipe, Schema, Struct } from 'effect'
import { NonEmptyString } from '../../../types/index.ts'

export type UseOfAiForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<UseOfAiForm, InvalidForm>

export type SubmittedForm = Exclude<UseOfAiForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  generativeAiIdeas: Either.Either<never, Missing>
  generativeAiIdeasDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  generativeAiIdeas: 'yes' | 'no'
  generativeAiIdeasDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const generativeAiIdeas = pipe(
    Schema.decodeEither(GenerativeAiIdeasFieldSchema)(body),
    Either.mapBoth({
      onRight: Struct.get('generativeAiIdeas'),
      onLeft: () => new Missing(),
    }),
  )
  const generativeAiIdeasDetails = pipe(
    Schema.decodeOption(GenerativeAiIdeasDetailsFieldSchema)(body),
    Option.flatMap(Struct.get('generativeAiIdeasDetails')),
  )

  return Either.match(generativeAiIdeas, {
    onRight: generativeAiIdeas =>
      new CompletedForm({
        generativeAiIdeas,
        generativeAiIdeasDetails: generativeAiIdeas === 'yes' ? generativeAiIdeasDetails : Option.none(),
      }),
    onLeft: generativeAiIdeas =>
      new InvalidForm({ generativeAiIdeas: Either.left(generativeAiIdeas), generativeAiIdeasDetails }),
  })
}

export const fromAnswer: (
  answer:
    | { _tag: 'AiWasUsed'; generativeAiIdeasDetails: Option.Option<NonEmptyString.NonEmptyString> }
    | { _tag: 'AiWasNotUsed' }
    | { _tag: 'NotAnswered' },
) => ValidForm = Match.valueTags({
  AiWasUsed: ({ generativeAiIdeasDetails }) =>
    new CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails }),
  AiWasNotUsed: () => new CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
  NotAnswered: () => new EmptyForm(),
})

const GenerativeAiIdeasFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    generativeAiIdeas: Schema.Literal('yes', 'no'),
  }),
)

const GenerativeAiIdeasDetailsFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    generativeAiIdeasDetails: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
  }),
)
