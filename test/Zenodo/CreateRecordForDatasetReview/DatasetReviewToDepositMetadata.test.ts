import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as _ from '../../../src/Zenodo/CreateRecordForDatasetReview/DatasetReviewToDepositMetadata.js'
import type { DepositMetadata } from '../../../src/Zenodo/Deposition.js'
import { rawHtml } from '../../../src/html.js'
import { Doi } from '../../../src/types/index.js'

test('DatasetReviewToDepositMetadata', () => {
  const datasetReview = {
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
  } satisfies _.DatasetReview

  const expected = {
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
  } satisfies DepositMetadata

  const actual = _.DatasetReviewToDepositMetadata(datasetReview)

  expect(actual).toStrictEqual(expected)
})
