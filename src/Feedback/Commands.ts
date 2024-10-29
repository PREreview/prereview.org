import type { Doi } from 'doi-ts'
import { Data } from 'effect'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'

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

export class AgreeToCodeOfConduct extends Data.TaggedClass('AgreeToCodeOfConduct') {}

export class PublishFeedback extends Data.TaggedClass('PublishFeedback') {}

export class MarkFeedbackAsPublished extends Data.TaggedClass('MarkFeedbackAsPublished')<{
  id: number
  doi: Doi
}> {}

export type FeedbackCommand =
  | StartFeedback
  | EnterFeedback
  | ChoosePersona
  | AgreeToCodeOfConduct
  | PublishFeedback
  | MarkFeedbackAsPublished
