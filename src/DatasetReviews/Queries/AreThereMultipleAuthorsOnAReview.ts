import type * as Queries from '../../Queries.ts'
import type { Uuid } from '../../types/index.ts'

export type Input = Uuid.Uuid

export type Result = boolean

export declare const AreThereMultipleAuthorsOnAReview: Queries.OnDemandQuery<[Input], Result>
