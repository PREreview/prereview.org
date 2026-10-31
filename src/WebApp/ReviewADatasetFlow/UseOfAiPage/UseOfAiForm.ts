import type { UrlParams } from 'effect/http'
import { Data, Result, Match, Option, pipe, Schema, Struct } from 'effect'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import { NonEmptyString } from '../../../types/index.ts'

export type UseOfAiForm = EmptyForm | InvalidForm | CompletedForm

export type ValidForm = Exclude<UseOfAiForm, InvalidForm>

export type SubmittedForm = Exclude<UseOfAiForm, EmptyForm>

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  generativeAiIdeas: Result.Result<never, Missing>
  generativeAiIdeasDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  generativeAiIdeas: 'yes' | 'no'
  generativeAiIdeasDetails: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export const fromBody = (body: UrlParams.UrlParams): SubmittedForm => {
  const generativeAiIdeas = pipe(
    Schema.decodeResult(GenerativeAiIdeasFieldSchema)(body),
    Result.mapBoth({
      onSuccess: Struct.get('generativeAiIdeas'),
      onFailure: () => new Missing(),
    }),
  )
  const generativeAiIdeasDetails = pipe(
    Schema.decodeOption(GenerativeAiIdeasDetailsFieldSchema)(body),
    Option.flatMap(Struct.get('generativeAiIdeasDetails')),
  )

  return Result.match(generativeAiIdeas, {
    onSuccess: generativeAiIdeas =>
      new CompletedForm({
        generativeAiIdeas,
        generativeAiIdeasDetails: generativeAiIdeas === 'yes' ? generativeAiIdeasDetails : Option.none(),
      }),
    onFailure: generativeAiIdeas =>
      new InvalidForm({ generativeAiIdeas: Result.fail(generativeAiIdeas), generativeAiIdeasDetails }),
  })
}

export const fromAnswer: (answer: DatasetReviews.UseOfAi) => ValidForm = Match.valueTags({
  AiWasUsed: ({ generativeAiIdeasDetails }) =>
    new CompletedForm({ generativeAiIdeas: 'yes', generativeAiIdeasDetails }),
  AiWasNotUsed: () => new CompletedForm({ generativeAiIdeas: 'no', generativeAiIdeasDetails: Option.none() }),
  NotAnswered: () => new EmptyForm(),
})

const GenerativeAiIdeasFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      generativeAiIdeas: Schema.Literals(['yes', 'no']),
    }),
  ),
)

const GenerativeAiIdeasDetailsFieldSchema = Schema.RecordFromUrlParams.pipe(
  Schema.decodeTo(
    Schema.Struct({
      generativeAiIdeasDetails: Schema.OptionFromOptional(NonEmptyString.NonEmptyStringSchema),
    }),
  ),
)
