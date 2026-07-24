import type { UrlParams } from '@effect/platform'
import type { Effect } from 'effect'
import type { ContentfulIsUnavailable } from '../Errors.ts'
import type { Entries } from '../Types.ts'

export declare const GetEntries: (params?: UrlParams.Input) => Effect.Effect<Entries, ContentfulIsUnavailable>
