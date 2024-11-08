import type { Doi } from 'doi-ts'
import { Data, type Option } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'
import type { NonEmptyString } from '../types/index.js'

export class StartComment extends Data.TaggedClass('StartComment')<{
  prereviewId: number
  authorId: Orcid
}> {}

export class EnterComment extends Data.TaggedClass('EnterComment')<{
  comment: Html
}> {}

export class ChoosePersona extends Data.TaggedClass('ChoosePersona')<{
  persona: 'public' | 'pseudonym'
}> {}

export class DeclareCompetingInterests extends Data.TaggedClass('DeclareCompetingInterests')<{
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export class AgreeToCodeOfConduct extends Data.TaggedClass('AgreeToCodeOfConduct') {}

export class PublishComment extends Data.TaggedClass('PublishComment') {}

export class MarkDoiAsAssigned extends Data.TaggedClass('MarkDoiAsAssigned')<{
  id: number
  doi: Doi
}> {}

export class MarkCommentAsPublished extends Data.TaggedClass('MarkCommentAsPublished') {}

export type CommentCommand =
  | StartComment
  | EnterComment
  | ChoosePersona
  | DeclareCompetingInterests
  | AgreeToCodeOfConduct
  | PublishComment
  | MarkDoiAsAssigned
  | MarkCommentAsPublished
