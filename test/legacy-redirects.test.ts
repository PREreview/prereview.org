import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Status } from 'hyper-ts'
import supertest from 'supertest'
import * as _ from '../src/legacy-redirects'

test.each([
  ['/login', '/log-in'],
  ['/logout', '/log-out'],
  ['/preprints/arxiv-2204.09673', '/preprints/doi-10.48550-arxiv.2204.09673'],
  ['/preprints/arxiv-1312.0906', '/preprints/doi-10.48550-arxiv.1312.0906'],
  [
    '/preprints/a5ff6309-cba7-4eb3-9e2c-b1eb4c391983/full-reviews/e7dc4769-827b-4b79-b38e-b0cf22758ec5',
    '/preprints/a5ff6309-cba7-4eb3-9e2c-b1eb4c391983',
  ],
  [
    '/preprints/96da7e82-2e5a-433b-b72e-2b5726220fe7/full-reviews/bdfb53db-491d-45c5-880f-31c88173ed28',
    '/preprints/96da7e82-2e5a-433b-b72e-2b5726220fe7',
  ],
  ['/reviews', '/reviews?page=1'],
  ['/reviews/new', '/review-a-preprint'],
  ['/validate/838df174-081f-4701-b314-cf568c8d6839', '/preprints/838df174-081f-4701-b314-cf568c8d6839'],
])('legacyRedirects (%s)', async (path, expected) => {
  const response = await supertest(_.legacyRedirects).get(path)

  expect(response.status).toStrictEqual(Status.MovedPermanently)
  expect(response.headers['location']).toStrictEqual(expected)
})
