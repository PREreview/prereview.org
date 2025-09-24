import type { Doi } from 'doi-ts'
import { Data, type Option } from 'effect'
import type { Html } from '../html.ts'
import type { NonEmptyString } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'

export class CommentNotStarted extends Data.TaggedClass('CommentNotStarted') {}

export class CommentInProgress extends Data.TaggedClass('CommentInProgress')<{
  authorId: OrcidId
  prereviewId: number
  comment?: Html
  persona?: 'public' | 'pseudonym'
  codeOfConductAgreed?: true
  competingInterests?: Option.Option<NonEmptyString.NonEmptyString>
  verifiedEmailAddressExists?: true
}> {}

export class CommentReadyForPublishing extends Data.TaggedClass('CommentReadyForPublishing')<{
  authorId: OrcidId
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  comment: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class CommentBeingPublished extends Data.TaggedClass('CommentBeingPublished')<{
  authorId: OrcidId
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  doi?: Doi
  id?: number
  comment: Html
  persona: 'public' | 'pseudonym'
  prereviewId: number
}> {}

export class CommentPublished extends Data.TaggedClass('CommentPublished')<{
  authorId: OrcidId
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
