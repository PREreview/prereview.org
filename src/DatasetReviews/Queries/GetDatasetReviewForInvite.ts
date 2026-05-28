import type { Either } from 'effect'
import type { DatasetId } from '../../Datasets/index.ts'
import type * as Queries from '../../Queries.ts'
import type { Doi, OrcidId, Temporal, Uuid } from '../../types/index.ts'

export type Input = Uuid.Uuid

export interface DatasetReviewForInvite {
  author: {
    orcidId: OrcidId.OrcidId
    persona: 'public' | 'pseudonym'
  }
  otherAuthors: ReadonlyArray<{
    orcidId: OrcidId.OrcidId
    persona: 'public' | 'pseudonym'
  }>
  anonymousAuthors: number
  doi: Doi.Doi
  id: Uuid.Uuid
  published: Temporal.PlainDate
  dataset: DatasetId
}

export type Result = Either.Either<DatasetReviewForInvite>

type State = unknown

export declare const GetDatasetReviewForInvite: Queries.StatefulQuery<State, [Input], Either.Either.Right<Result>>
