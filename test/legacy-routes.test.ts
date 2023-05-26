import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express'
import { createRequest, createResponse } from 'node-mocks-http'
import * as _ from '../src/legacy-routes'
import { runMiddleware } from './middleware'

describe('legacyRoutes', () => {
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
  ])('redirects %s', async (path, expected) => {
    const actual = await runMiddleware(
      _.legacyRoutes({}),
      new ExpressConnection(createRequest({ path }), createResponse()),
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.MovedPermanently },
        { type: 'setHeader', name: 'Location', value: expected },
        { type: 'endResponse' },
      ]),
    )
  })

  test.each([
    ['/prereviewers'],
    ['/prereviewers?page=1'],
    [
      '/prereviewers?badges=Reviewer+Trainee%2CPREreview+V1&sort=dateJoined&page=2&limit=10&offset=10&communities=Photosynthesis',
    ],
  ])('removed page for %s', async path => {
    const actual = await runMiddleware(
      _.legacyRoutes({}),
      new ExpressConnection(createRequest({ path }), createResponse()),
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.stringContaining('Sorry, we’ve removed this page for now') },
      ]),
    )
  })
})
