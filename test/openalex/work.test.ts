import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { toUrl } from 'doi-ts'
import type { FetchEnv } from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { NetworkError, UnexpectedStatusCode } from '../../src/openalex/http'
import * as _ from '../../src/openalex/work'
import * as fc from './fc'

describe('getWorkByDoi', () => {
  test.prop([
    fc.doi(),
    fc
      .work()
      .chain(work =>
        fc.tuple(
          fc.fetchResponse({ status: fc.constant(Status.OK), json: fc.constant(_.WorkC.encode(work)) }),
          fc.constant(work),
        ),
      ),
  ])('when the work can be decoded', async (doi, [response, expected]) => {
    const fetch = jest.fn<FetchEnv['fetch']>(_ => Promise.resolve(response))

    const actual = await _.getWorkByDoi(doi)({ fetch })()

    expect(actual).toStrictEqual(E.right(expected))
    expect(fetch).toHaveBeenCalledWith(
      `https://api.openalex.org/works/${toUrl(doi).href}`,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  test.prop([fc.doi(), fc.fetchResponse({ status: fc.constant(Status.OK) })])(
    "when the work can't be decoded",
    async (doi, response) => {
      const actual = await _.getWorkByDoi(doi)({ fetch: () => Promise.resolve(response) })()

      expect(actual).toStrictEqual(E.left(expect.objectContaining({ _tag: 'UnableToDecodeBody' })))
    },
  )

  test.prop([fc.doi(), fc.fetchResponse({ status: fc.integer().filter(status => status !== Status.OK) })])(
    'when the status code is not ok',
    async (doi, response) => {
      const actual = await _.getWorkByDoi(doi)({ fetch: () => Promise.resolve(response) })()

      expect(actual).toStrictEqual(E.left(UnexpectedStatusCode(response.status)))
    },
  )

  test.prop([fc.doi(), fc.error()])('when the request fails', async (doi, error) => {
    const actual = await _.getWorkByDoi(doi)({ fetch: () => Promise.reject(error) })()

    expect(actual).toStrictEqual(E.left(NetworkError(error)))
  })
})

describe('getFields', () => {
  test.prop([
    fc.tuple(fc.url(), fc.url()).chain(urls =>
      fc.tuple(
        fc.work({
          topics: fc.constant([{ field: { id: urls[0] } }, { field: { id: urls[1] } }, { field: { id: urls[0] } }]),
        }),
        fc.constant(urls),
      ),
    ),
  ])('removes duplicates', ([work, expected]) => {
    const actual = _.getFields(work)

    expect(actual).toStrictEqual(expected)
  })
})
