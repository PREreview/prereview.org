import type * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/index.ts'

export type Input = OrcidId.OrcidId

export type Result = boolean

export declare const IsRegistered: Queries.OnDemandQuery<'RegisteredPrereviewerImported', [Input], Result, never>
