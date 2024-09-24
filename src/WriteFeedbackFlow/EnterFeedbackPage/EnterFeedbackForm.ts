import { Data, type Either, Match, pipe } from 'effect'
import type * as Feedback from '../../Feedback/index.js'
import type { Html } from '../../html.js'

export type EnterFeedbackForm = EmptyForm | InvalidForm | CompletedForm

export class Missing extends Data.TaggedError('Missing') {}

export class EmptyForm extends Data.TaggedClass('EmptyForm') {}

export class InvalidForm extends Data.TaggedClass('InvalidForm')<{
  feedback: Either.Either<never, Missing>
}> {}

export class CompletedForm extends Data.TaggedClass('CompletedForm')<{
  feedback: Html
}> {}

export const fromFeedback = pipe(
  Match.type<Feedback.FeedbackInProgress | Feedback.FeedbackReadyForPublishing>(),
  Match.tag('FeedbackInProgress', () => new EmptyForm()),
  Match.tag('FeedbackReadyForPublishing', ({ feedback }) => new CompletedForm({ feedback })),
  Match.exhaustive,
)
