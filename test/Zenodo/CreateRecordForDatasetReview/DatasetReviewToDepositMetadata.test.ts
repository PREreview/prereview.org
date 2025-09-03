import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../../src/Zenodo/CreateRecordForDatasetReview/DatasetReviewToDepositMetadata.js'
import type { DepositMetadata } from '../../../src/Zenodo/Deposition.js'
import { rawHtml } from '../../../src/html.js'
import { Doi, NonEmptyString } from '../../../src/types/index.js'

const cases = [
  [
    'all questions answered',
    {
      qualityRating: Option.some('excellent'),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
      answerToIfTheDatasetHasEnoughMetadata: Option.some('partly'),
      answerToIfTheDatasetHasTrackedChanges: Option.some('no'),
      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('unsure'),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some('yes'),
      answerToIfTheDatasetSupportsRelatedConclusions: Option.some('partly'),
      answerToIfTheDatasetIsDetailedEnough: Option.some('no'),
      answerToIfTheDatasetIsErrorFree: Option.some('unsure'),
      answerToIfTheDatasetIsReadyToBeShared: Option.some('yes'),
      answerToIfTheDatasetIsMissingAnything: Option.some(
        NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
      ),
    },
    {
      creators: [{ name: 'A PREreviewer' }],
      description: rawHtml(`
    <dl>
      
          <dt>How would you rate the quality of this data set?</dt>
          <dd>
            Excellent
          </dd>
        
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
      <dd>
        Yes
      </dd>
      
          <dt>Does the dataset have enough metadata?</dt>
          <dd>
            Partly
          </dd>
        
      
          <dt>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</dt>
          <dd>
            No
          </dd>
        
      
          <dt>
            Does this dataset show signs of alteration beyond instances of likely human error, such as censorship,
            deletion, or redaction, that are not accounted for otherwise?
          </dt>
          <dd>
            I don’t know
          </dd>
        
      
          <dt>Is the dataset well-suited to support its stated research purpose?</dt>
          <dd>
            Yes
          </dd>
        
      
          <dt>Does this dataset support the researcher’s stated conclusions?</dt>
          <dd>
            Partly
          </dd>
        
      
          <dt>Is the dataset granular enough to be a reliable standard of measurement?</dt>
          <dd>
            No
          </dd>
        
      
          <dt>Is the dataset relatively error-free?</dt>
          <dd>
            I don’t know
          </dd>
        
      
          <dt>Is this dataset ready to be shared?</dt>
          <dd>
            Yes
          </dd>
        
      
          <dt>
            What else, if anything, would it be helpful for the researcher to include with this dataset to make it
            easier to find, understand and reuse in ethical and responsible ways?
          </dt>
          <dd>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</dd>
        
    </dl>
  `),
      title: 'Dataset review',
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
        },
      ],
      uploadType: 'publication',
      publicationType: 'peerreview',
    },
  ],
  [
    'minimal questions answered',
    {
      qualityRating: Option.none(),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
      answerToIfTheDatasetHasEnoughMetadata: Option.none(),
      answerToIfTheDatasetHasTrackedChanges: Option.none(),
      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
      answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
      answerToIfTheDatasetIsDetailedEnough: Option.none(),
      answerToIfTheDatasetIsErrorFree: Option.none(),
      answerToIfTheDatasetIsReadyToBeShared: Option.none(),
      answerToIfTheDatasetIsMissingAnything: Option.none(),
    },
    {
      creators: [{ name: 'A PREreviewer' }],
      description: rawHtml(`
    <dl>
      
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
      <dd>
        Yes
      </dd>
      
      
      
      
      
      
      
      
      
    </dl>
  `),
      title: 'Dataset review',
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
        },
      ],
      uploadType: 'publication',
      publicationType: 'peerreview',
    },
  ],
] satisfies ReadonlyArray<[string, _.DatasetReview, DepositMetadata]>

test.each(cases)('DatasetReviewToDepositMetadata (%s)', (_name, datasetReview, expected) => {
  const actual = _.DatasetReviewToDepositMetadata(datasetReview)

  expect(actual).toStrictEqual(expected)
})
