import type { Doi } from 'doi-ts'
import { Data } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'

export class StartFeedback extends Data.TaggedClass('StartFeedback')<{
  prereviewId: number
  authorId: Orcid
}> {}

export class EnterFeedback extends Data.TaggedClass('EnterFeedback')<{
  feedback: Html
}> {}

export class MarkFeedbackAsPublished extends Data.TaggedClass('MarkFeedbackAsPublished')<{
  id: number
  doi: Doi
}> {}

export type FeedbackCommand = StartFeedback | EnterFeedback | MarkFeedbackAsPublished