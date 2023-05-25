import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Status } from 'hyper-ts'
import supertest from 'supertest'
import * as _ from '../src/legacy-redirects'

test.each([
  ['/preprints/arxiv-2204.09673', '/preprints/doi-10.48550-arxiv.2204.09673'],
  ['/preprints/arxiv-1312.0906', '/preprints/doi-10.48550-arxiv.1312.0906'],
])('legacyRedirects', async (path, expected) => {
  const response = await supertest(_.legacyRedirects).get(path)

  expect(response.status).toStrictEqual(Status.MovedPermanently)
  expect(response.headers['location']).toStrictEqual(expected)
})
