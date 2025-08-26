import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../../src/Zenodo/CreateRecordForDatasetReview/DatasetReviewToDepositMetadata.js'
import type { DepositMetadata } from '../../../src/Zenodo/Deposition.js'
import { rawHtml } from '../../../src/html.js'
import { Doi } from '../../../src/types/index.js'

const cases = [
  [
    'all questions answered',
    {
      answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
      answerToIfTheDatasetHasEnoughMetadata: Option.some('partly'),
      answerToIfTheDatasetHasTrackedChanges: Option.some('no'),
    },
    {
      creators: [{ name: 'A PREreviewer' }],
      description: rawHtml(`
    <dl>
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
      <dd>
        Yes
      </dd>
      
          <dt>Does the dataset have enough metadata?</dt>
          <dd>
            Partly
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
  [
    'minimal questions answered',
    {
      answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
      answerToIfTheDatasetHasEnoughMetadata: Option.none(),
      answerToIfTheDatasetHasTrackedChanges: Option.none(),
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
