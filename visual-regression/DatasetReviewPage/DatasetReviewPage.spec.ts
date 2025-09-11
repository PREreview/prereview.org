import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as _ from '../../src/DatasetReviewPage/DatasetReviewPage.js'
import * as Personas from '../../src/Personas/index.js'
import { Doi, NonEmptyString, Orcid, Uuid } from '../../src/types/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.createDatasetReviewPage({
    datasetReview,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReview: _.DatasetReview = {
  author: new Personas.PublicPersona({
    name: NonEmptyString.NonEmptyString('Josiah Carberry'),
    orcidId: Orcid.Orcid('0000-0002-1825-0097'),
  }),
  doi: Doi.Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  questions: {
    qualityRating: Option.some('excellent'),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
    answerToIfTheDatasetHasEnoughMetadata: Option.some('yes'),
    answerToIfTheDatasetHasTrackedChanges: Option.some('yes'),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('yes'),
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some('yes'),
    answerToIfTheDatasetSupportsRelatedConclusions: Option.some('yes'),
    answerToIfTheDatasetIsDetailedEnough: Option.some('yes'),
    answerToIfTheDatasetIsErrorFree: Option.some('yes'),
    answerToIfTheDatasetMattersToItsAudience: Option.some('very-consequential'),
    answerToIfTheDatasetIsReadyToBeShared: Option.some('yes'),
    answerToIfTheDatasetIsMissingAnything: Option.some(
      NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    ),
  },
  published: Temporal.PlainDate.from('2025-08-06'),
}
