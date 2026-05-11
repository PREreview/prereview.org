import type * as Preprints from '../../Preprints/index.ts'
import type * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/index.ts'

export type Input = Preprints.IndeterminatePreprintId

export type Result = ReadonlyArray<OrcidId.OrcidId>

export declare const ListPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint: Queries.StatefulQuery<
  unknown,
  [Input],
  Result
>
