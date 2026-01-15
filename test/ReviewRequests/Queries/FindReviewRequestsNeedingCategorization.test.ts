import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Queries/FindReviewRequestsNeedingCategorization.ts'
import { Doi, NonEmptyString, Uuid } from '../../../src/types/index.ts'

const requester1 = { name: NonEmptyString.NonEmptyString('Josiah Carberry') }
const requester2 = { name: NonEmptyString.NonEmptyString('Jean-Baptiste Botul') }

const request1Id = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const request2Id = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')

const preprintId1 = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const preprintId2 = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })

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
const request2Imported = new ReviewRequests.ReviewRequestForAPreprintWasImported({
  publishedAt: now.subtract({ hours: 1 }),
  preprintId: preprintId2,
  requester: Option.some(requester2),
  reviewRequestId: request2Id,
})

test('query', () => {
  const actual = _.query([request1Imported, request1Categorized])

  expect(actual).toStrictEqual([])
})

test.failing.each<[string, ReadonlyArray<ReviewRequests.ReviewRequestEvent>, ReadonlyArray<Uuid.Uuid>]>([
  ['single not categorized', [request1Imported], [request1Id]],
  ['two not categorized', [request1Imported, request2Imported], [request1Id, request2Id]],
  ['partially categorized', [request1Imported, request2Imported, request1Categorized], [request2Id]],
])('query (%s)', (_name, events, expected) => {
  const actual = _.query(events)

  expect(actual).toStrictEqual(expected)
})
