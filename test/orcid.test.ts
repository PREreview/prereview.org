import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { Status } from 'hyper-ts'
import * as _ from '../src/orcid'
import * as fc from './fc'

describe('getNameFromOrcid', () => {
  test.prop([fc.orcid()])('when the request succeeds', async orcid => {
    const actual = await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch: fetchMock.sandbox().get('*', {
        body: { name: { 'given-names': { value: 'Daniela' }, 'family-name': { value: 'Saderi' } } },
      }),
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right('Daniela Saderi'))
  })

  test.prop([fc.orcid(), fc.integer({ min: 100, max: 599 }).filter(status => status !== Status.OK)])(
    'when the request fails',
    async (orcid, status) => {
      const actual = await _.getNameFromOrcid(orcid)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().get('*', { status }),
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )

  test.prop([fc.orcid()])('when the network fails', async orcid => {
    const actual = await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch: () => Promise.reject('network error'),
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
