import type { HashMap } from 'effect'
import type * as Queries from '../Queries.ts'
import type { OrcidId, Temporal } from '../types/index.ts'

export interface PrereviewerForStats {
  orcidId: OrcidId.OrcidId
  registeredAt: Temporal.Instant | 'not available from import source'
}

export type Result = ReadonlyArray<PrereviewerForStats>

export type State = HashMap.HashMap<OrcidId.OrcidId, PrereviewerForStats>

export declare const ListAllPrereviewersForStats: Queries.StatefulQuery<State, [], Result, never>
