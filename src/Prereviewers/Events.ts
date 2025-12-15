import { Schema } from 'effect'
import { OrcidId } from '../types/index.ts'
import { KeywordIdSchema } from '../types/Keyword.ts'

export type PrereviewerEvent = typeof PrereviewerEvent.Type

export class PrereviewerSubscribedToAKeyword extends Schema.TaggedClass<PrereviewerSubscribedToAKeyword>()(
  'PrereviewerSubscribedToAKeyword',
  {
    prereviewerId: OrcidId.OrcidIdSchema,
    keywordId: KeywordIdSchema,
  },
) {}

export const PrereviewerEvent = PrereviewerSubscribedToAKeyword

export const PrereviewerEventTypes = PrereviewerSubscribedToAKeyword._tag
