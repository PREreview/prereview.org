import type { Doi } from 'doi-ts'
import { Data, type Option } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'

export class FeedbackNotStarted extends Data.TaggedClass('FeedbackNotStarted') {}

export class FeedbackInProgress extends Data.TaggedClass('FeedbackInProgress')<{
  authorId: Orcid
  prereviewId: number
  feedback?: Html
  persona?: 'public' | 'pseudonym'
  codeOfConductAgreed?: true
  competingInterests?: Option.Option<Html>
}> {}

export class FeedbackReadyForPublishing extends Data.TaggedClass('FeedbackReadyForPublishing')<{
  authorId: Orcid
  competingInterests?: Option.Option<Html>
  feedback: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class FeedbackBeingPublished extends Data.TaggedClass('FeedbackBeingPublished')<{
  authorId: Orcid
  competingInterests?: Option.Option<Html>
  doi?: Doi
  id?: number
  feedback: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class FeedbackPublished extends Data.TaggedClass('FeedbackPublished')<{
  authorId: Orcid
  competingInterests?: Option.Option<Html>
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
