import { Data } from 'effect'
import type { OrcidId } from '../../../types/OrcidId.ts'
import type { Pseudonym } from '../../../types/Pseudonym.ts'
import type { PreprintId } from '../../Preprints/index.ts'
import type { PreprintReviewForReviewsData } from './ListPreprintReviewsForReviewsData.ts'

export type PublishedPreprintReviewForReviewsData = Omit<PreprintReviewForReviewsData, 'authors' | 'preprint'> & {
  readonly authors: ReadonlyArray<
    | { readonly _tag: 'Public'; readonly orcidId: OrcidId }
    | { readonly _tag: 'Pseudonym'; readonly pseudonym: Pseudonym }
  >
  readonly preprint: PreprintId
  readonly requested: boolean
}

export class PrereviewsAreUnavailable extends Data.TaggedError('PrereviewsAreUnavailable')<{ cause?: unknown }> {}
