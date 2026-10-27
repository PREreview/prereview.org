import { UrlParams } from '@effect/platform'
import { Data, Either, Option, pipe, Schema, Struct } from 'effect'

export type UseOfAiForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<UseOfAiForm, InvalidForm>

export type SubmittedForm = Exclude<UseOfAiForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  generativeAiIdeas: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  generativeAiIdeas: 'yes' | 'no'
}> {}

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const generativeAiIdeas = pipe(
    Schema.decodeEither(GenerativeAiIdeasFieldSchema)(body),
    Either.mapBoth({
      onRight: Struct.get('generativeAiIdeas'),
      onLeft: () => new Missing(),
    }),
  )

  return Either.match(generativeAiIdeas, {
    onRight: generativeAiIdeas => new CompletedForm({ generativeAiIdeas }),
    onLeft: generativeAiIdeas => new InvalidForm({ generativeAiIdeas: Either.left(generativeAiIdeas) }),
  })
}

export const fromAnswer: (answer: Option.Option<'yes' | 'no'>) => ValidForm = Option.match({
  onNone: () => new EmptyForm(),
  onSome: generativeAiIdeas => new CompletedForm({ generativeAiIdeas }),
})

const GenerativeAiIdeasFieldSchema = UrlParams.schemaRecord(
  Schema.Struct({
    generativeAiIdeas: Schema.Literal('yes', 'no'),
  }),
)
