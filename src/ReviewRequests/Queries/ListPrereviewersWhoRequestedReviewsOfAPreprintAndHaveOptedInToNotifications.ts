import type { HashSet } from 'effect'
import type * as Preprints from '../../Preprints/index.ts'
import type * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/index.ts'

export type Input = Preprints.IndeterminatePreprintId

export type Result = HashSet.HashSet<OrcidId.OrcidId>

type State = unknown

export declare const ListPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications: Queries.StatefulQuery<
  State,
  [Input],
  Result
>
