import type { Either } from 'effect'
import type { DatasetId } from '../../Datasets/index.ts'
import type * as Queries from '../../Queries.ts'
import type { Doi, OrcidId, Temporal, Uuid } from '../../types/index.ts'
import type * as Errors from '../Errors.ts'

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

export type Result = Either.Either<
  DatasetReviewForInvite,
  Errors.DatasetReviewInvitationNotInList | Errors.DatasetReviewHasNotBeenPublished
>

export declare const GetDatasetReviewForInvite: Queries.StatefulQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
>
