import { UrlParams } from '@effect/platform'
import { Data, Either, Option, pipe, Schema, Struct } from 'effect'
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
  answer: Option.Option<{
    answer: 'yes' | 'no'
    detail: Option.Option<NonEmptyString.NonEmptyString>
  }>,
) => ValidForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: ({ answer, detail }) =>
    new CompletedForm({
      generativeAiIdeas: answer,
      generativeAiIdeasDetails: answer === 'yes' ? detail : Option.none(),
    }),
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
