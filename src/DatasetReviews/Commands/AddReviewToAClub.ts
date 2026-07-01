import type { ClubId } from '../../Clubs/index.ts'
import type * as Commands from '../../Commands.ts'
import type { Uuid } from '../../types/Uuid.ts'
import type { DatasetReviewHasAlreadyBeenAddedToAClub, UnknownDatasetReview } from '../Errors.ts'

export interface Input {
  readonly datasetReviewId: Uuid
  readonly clubId: ClubId
}

export type Error = DatasetReviewHasAlreadyBeenAddedToAClub | UnknownDatasetReview

type State = unknown

export declare const AddReviewToAClub: Commands.Command<[Input], State, Error>
