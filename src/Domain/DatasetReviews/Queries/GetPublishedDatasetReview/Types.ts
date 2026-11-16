import { Data, type Option } from 'effect'
import type { ClubName } from '../../../Clubs/index.ts'
import type { Dataset } from '../../../Datasets/index.ts'
import type { Persona } from '../../../Prereviewers/index.ts'
import type { PublishedReview } from '../GetPublishedReview.ts'

export class PublishedDatasetReview extends Data.TaggedClass('PublishedDatasetReview')<
  Omit<PublishedReview, 'author' | 'otherAuthors' | 'anonymousAuthors' | 'clubId' | 'dataset'> & {
    author: Persona
    otherAuthors: ReadonlyArray<Persona>
    anonymousAuthors: number
    club: Option.Option<ClubName>
    dataset: Dataset
  }
> {}

export class DatasetReviewIsUnavailable extends Data.TaggedError('DatasetReviewIsUnavailable')<{ cause?: unknown }> {}
