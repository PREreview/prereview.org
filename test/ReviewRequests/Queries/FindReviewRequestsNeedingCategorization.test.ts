import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/FindReviewRequestsNeedingCategorization.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'

const requester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })

const now = Temporal.Now.instant()

const request1Imported = new ReviewRequests.ReviewRequestForAPreprintWasImported({
  publishedAt: now.subtract({ hours: 2 }),
  preprintId: preprintId1,
  requester: Option.some(requester1),
  reviewRequestId: request1Id,
})
const request1Categorized = new ReviewRequests.ReviewRequestForAPreprintWasCategorized({
  language: 'es',
  keywords: ['bc372b08bff50a48358e', 'd164de1eaf4ecfbd8833'],
  topics: ['13741', '12422'],
  reviewRequestId: request1Id,
})

test('query', () => {
  const actual = _.query([request1Imported, request1Categorized])

  expect(actual).toStrictEqual([])
})
