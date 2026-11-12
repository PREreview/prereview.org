import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import type * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { Prereview, PrereviewIsNotFound, PrereviewIsUnavailable, PrereviewWasRemoved } from './Prereview.ts'

export type Input = number

export type Result = Omit<Prereview, '_tag' | 'pipe' | 'club' | 'preprint' | 'authors'> & {
  clubId?: Uuid
  preprintId: IndeterminatePreprintId
  authors: {
    named: ReadonlyArray<{ orcidId: OrcidId; persona: 'public' | 'pseudonym' }>
    anonymous: number
  }
}

export type Error = PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved

export declare const GetPublishedPreprintReview: (
  removedPreprintReviewIds: ReadonlyArray<number>,
) => Queries.OnDemandQuery<[number], Result, Error>
