import { Data } from 'effect'
import type { Uuid } from '../types/index.ts'

export class ExpectedToStartAComment extends Data.TaggedClass('ExpectedToStartAComment') {}

export class ExpectedToEnterAComment extends Data.TaggedClass('ExpectedToEnterAComment')<{ commentId: Uuid.Uuid }> {}

export class ExpectedToChooseAPersona extends Data.TaggedClass('ExpectedToChooseAPersona')<{ commentId: Uuid.Uuid }> {}

export class ExpectedToDeclareCompetingInterests extends Data.TaggedClass('ExpectedToDeclareCompetingInterests')<{
  commentId: Uuid.Uuid
}> {}

export class ExpectedToAgreeToCodeOfConduct extends Data.TaggedClass('ExpectedToAgreeToCodeOfConduct')<{
  commentId: Uuid.Uuid
}> {}

export class ExpectedToVerifyEmailAddress extends Data.TaggedClass('ExpectedToVerifyEmailAddress')<{
  commentId: Uuid.Uuid
}> {}

export class ExpectedToPublishComment extends Data.TaggedClass('ExpectedToPublishComment')<{ commentId: Uuid.Uuid }> {}

export type ExpectedCommandForUser =
  | ExpectedToStartAComment
  | ExpectedToEnterAComment
  | ExpectedToChooseAPersona
  | ExpectedToDeclareCompetingInterests
  | ExpectedToAgreeToCodeOfConduct
  | ExpectedToVerifyEmailAddress
  | ExpectedToPublishComment
