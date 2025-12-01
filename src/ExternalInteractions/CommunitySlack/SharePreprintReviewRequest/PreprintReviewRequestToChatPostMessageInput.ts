import type * as Preprints from '../../../Preprints/index.ts'
import type { NonEmptyString } from '../../../types/index.ts'

export interface PreprintReviewRequest {
  readonly author: NonEmptyString.NonEmptyString
  readonly preprint: Preprints.Preprint
}
