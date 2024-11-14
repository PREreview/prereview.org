import type { Doi } from 'doi-ts'
import { Data, type Option } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'
import type { NonEmptyString } from '../types/index.js'

export class CommentNotStarted extends Data.TaggedClass('CommentNotStarted') {}

export class CommentInProgress extends Data.TaggedClass('CommentInProgress')<{
  authorId: Orcid
  prereviewId: number
  comment?: Html
  persona?: 'public' | 'pseudonym'
  codeOfConductAgreed?: true
  competingInterests?: Option.Option<NonEmptyString.NonEmptyString>
  verifiedEmailAddressExists?: true
}> {}

export class CommentReadyForPublishing extends Data.TaggedClass('CommentReadyForPublishing')<{
  authorId: Orcid
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  comment: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class CommentBeingPublished extends Data.TaggedClass('CommentBeingPublished')<{
  authorId: Orcid
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  doi?: Doi
  id?: number
  comment: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class CommentPublished extends Data.TaggedClass('CommentPublished')<{
  authorId: Orcid
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  doi: Doi
  id: number
  comment: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export type CommentState =
  | CommentNotStarted
  | CommentInProgress
  | CommentReadyForPublishing
  | CommentBeingPublished
  | CommentPublished
