import type { Doi } from 'doi-ts'
import { Data, type Option } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'
import type { NonEmptyString } from '../types/index.js'

export class FeedbackNotStarted extends Data.TaggedClass('FeedbackNotStarted') {}

export class FeedbackInProgress extends Data.TaggedClass('FeedbackInProgress')<{
  authorId: Orcid
  prereviewId: number
  feedback?: Html
  persona?: 'public' | 'pseudonym'
  codeOfConductAgreed?: true
  competingInterests?: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export class FeedbackReadyForPublishing extends Data.TaggedClass('FeedbackReadyForPublishing')<{
  authorId: Orcid
  competingInterests?: Option.Option<NonEmptyString.NonEmptyString>
  feedback: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class FeedbackBeingPublished extends Data.TaggedClass('FeedbackBeingPublished')<{
  authorId: Orcid
  competingInterests?: Option.Option<NonEmptyString.NonEmptyString>
  doi?: Doi
  id?: number
  feedback: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class FeedbackPublished extends Data.TaggedClass('FeedbackPublished')<{
  authorId: Orcid
  competingInterests?: Option.Option<NonEmptyString.NonEmptyString>
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
