import type * as Doi from 'doi-ts'
import type { Effect } from 'effect'
import type * as ReviewPage from '../review-page/index.js'

export declare const getCommentsForPrereviewFromZenodo: (
  id: Doi.Doi,
) => Effect.Effect<ReadonlyArray<ReviewPage.Comment>, 'unavailable'>
