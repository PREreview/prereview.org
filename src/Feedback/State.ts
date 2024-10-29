import type { Doi } from 'doi-ts'
import { Data } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'

export class FeedbackNotStarted extends Data.TaggedClass('FeedbackNotStarted') {}

export class FeedbackInProgress extends Data.TaggedClass('FeedbackInProgress')<{
  authorId: Orcid
  prereviewId: number
  feedback?: Html
  persona?: 'public' | 'pseudonym'
  codeOfConductAgreed?: true
}> {}

export class FeedbackReadyForPublishing extends Data.TaggedClass('FeedbackReadyForPublishing')<{
  authorId: Orcid
  feedback: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class FeedbackBeingPublished extends Data.TaggedClass('FeedbackBeingPublished')<{
  authorId: Orcid
  feedback: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class FeedbackPublished extends Data.TaggedClass('FeedbackPublished')<{
  authorId: Orcid
  doi: Doi
  id: number
  feedback: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export type FeedbackState =
  | FeedbackNotStarted
  | FeedbackInProgress
  | FeedbackReadyForPublishing
  | FeedbackBeingPublished
  | FeedbackPublished
