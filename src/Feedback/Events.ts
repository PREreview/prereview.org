import type { Doi } from 'doi-ts'
import { Data } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'

export class FeedbackWasStarted extends Data.TaggedClass('FeedbackWasStarted')<{
  prereviewId: number
  authorId: Orcid
}> {}

export class FeedbackWasEntered extends Data.TaggedClass('FeedbackWasEntered')<{
  feedback: Html
}> {}

export class FeedbackWasPublished extends Data.TaggedClass('FeedbackWasPublished')<{
  id: number
  doi: Doi
}> {}

export type FeedbackEvent = FeedbackWasStarted | FeedbackWasEntered | FeedbackWasPublished
