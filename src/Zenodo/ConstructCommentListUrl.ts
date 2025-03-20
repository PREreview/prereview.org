import type * as Doi from 'doi-ts'
import { Effect } from 'effect'
import { ZenodoOrigin } from './CommunityRecords.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const constructCommentListUrl = (prereviewDoi: Doi.Doi): Effect.Effect<URL, never, ZenodoOrigin> =>
  Effect.succeed(new URL('example.com'))
