import { Option } from 'effect'
import * as Datasets from '../../../src/Datasets/index.js'
import { html } from '../../../src/html.js'
import * as Personas from '../../../src/Personas/index.js'
import * as _ from '../../../src/ReviewADatasetFlow/CheckYourReviewPage/CheckYourReviewPage.js'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../src/types/index.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CheckYourReviewPage({
    datasetReviewId,
    review,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')

const review = {
  author: Option.some(
    new Personas.PublicPersona({
      name: NonEmptyString.NonEmptyString('Josiah Carberry'),
      orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
    }),
  ),
  competingInterests: Option.some(
    NonEmptyString.NonEmptyString(
      'Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
    ),
  ),
  dataset: new Datasets.DatasetTitle({
    id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
    title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
    language: 'en',
  }),
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
    Option.some(NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')),
  ),
} satisfies _.DatasetReviewPreview
