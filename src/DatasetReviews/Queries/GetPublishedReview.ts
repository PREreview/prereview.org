import type { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import type { Doi, Orcid, Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface PublishedReview {
  author: {
    name: string
    orcid?: Orcid.Orcid
  }
  doi: Doi.Doi
  id: Uuid.Uuid
  questions: {
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
  }
  published: Temporal.PlainDate
}

export const GetPublishedReview = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<PublishedReview, Errors.DatasetReviewHasNotBeenPublished | Errors.UnexpectedSequenceOfEvents> =>
  Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'not implemented' }))
