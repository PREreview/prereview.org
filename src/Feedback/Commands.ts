import type { Doi } from 'doi-ts'
import { Data, type Option } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'
import type { NonEmptyString } from '../types/index.js'

export class StartFeedback extends Data.TaggedClass('StartFeedback')<{
  prereviewId: number
  authorId: Orcid
}> {}

export class EnterFeedback extends Data.TaggedClass('EnterFeedback')<{
  feedback: Html
}> {}

export class ChoosePersona extends Data.TaggedClass('ChoosePersona')<{
  persona: 'public' | 'pseudonym'
}> {}

export class DeclareCompetingInterests extends Data.TaggedClass('DeclareCompetingInterests')<{
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
}> {}

export class AgreeToCodeOfConduct extends Data.TaggedClass('AgreeToCodeOfConduct') {}

export class PublishFeedback extends Data.TaggedClass('PublishFeedback') {}

export class MarkDoiAsAssigned extends Data.TaggedClass('MarkDoiAsAssigned')<{
  id: number
  doi: Doi
}> {}

export class MarkFeedbackAsPublished extends Data.TaggedClass('MarkFeedbackAsPublished') {}

export type FeedbackCommand =
  | StartFeedback
  | EnterFeedback
  | ChoosePersona
  | DeclareCompetingInterests
  | AgreeToCodeOfConduct
  | PublishFeedback
  | MarkDoiAsAssigned
  | MarkFeedbackAsPublished
