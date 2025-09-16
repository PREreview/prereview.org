import type { Doi } from 'doi-ts'
import { Data, type Option } from 'effect'
import type { Html } from '../html.js'
import type { NonEmptyString, Uuid } from '../types/index.js'
import type { Orcid } from '../types/Orcid.js'

export class StartComment extends Data.TaggedClass('StartComment')<{
  prereviewId: number
  authorId: Orcid
  commentId: Uuid.Uuid
}> {}

export class EnterComment extends Data.TaggedClass('EnterComment')<{
  comment: Html
  commentId: Uuid.Uuid
}> {}

export class ChoosePersona extends Data.TaggedClass('ChoosePersona')<{
  persona: 'public' | 'pseudonym'
  commentId: Uuid.Uuid
}> {}

export class DeclareCompetingInterests extends Data.TaggedClass('DeclareCompetingInterests')<{
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  commentId: Uuid.Uuid
}> {}

export class AgreeToCodeOfConduct extends Data.TaggedClass('AgreeToCodeOfConduct')<{ commentId: Uuid.Uuid }> {}

export class ConfirmExistenceOfVerifiedEmailAddress extends Data.TaggedClass('ConfirmExistenceOfVerifiedEmailAddress')<{
  commentId: Uuid.Uuid
}> {}

export class PublishComment extends Data.TaggedClass('PublishComment')<{ commentId: Uuid.Uuid }> {}

export class MarkDoiAsAssigned extends Data.TaggedClass('MarkDoiAsAssigned')<{
  id: number
  doi: Doi
  commentId: Uuid.Uuid
}> {}

export class MarkCommentAsPublished extends Data.TaggedClass('MarkCommentAsPublished')<{ commentId: Uuid.Uuid }> {}

export type CommentCommand =
  | StartComment
  | EnterComment
  | ChoosePersona
  | DeclareCompetingInterests
  | AgreeToCodeOfConduct
  | ConfirmExistenceOfVerifiedEmailAddress
  | PublishComment
  | MarkDoiAsAssigned
  | MarkCommentAsPublished
