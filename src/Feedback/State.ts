import type { Doi } from 'doi-ts'
import { Data } from 'effect'
import type { Html } from '../html.js'

export class FeedbackNotStarted extends Data.TaggedClass('FeedbackNotStarted') {}

export class FeedbackInProgress extends Data.TaggedClass('FeedbackInProgress')<{
  text?: Html
}> {}

export class FeedbackPublished extends Data.TaggedClass('FeedbackPublished')<{
  doi: Doi,
  id: number
}> {}

export type FeedbackState =
  | FeedbackNotStarted
  | FeedbackInProgress
  | FeedbackPublished
