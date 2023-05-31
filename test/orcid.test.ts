import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/orcid'
import * as fc from './fc'

describe('getNameFromOrcid', () => {
  describe('when the ORCID iD is 0000-0002-6109-0367', () => {
    test('when the request succeeds', async () => {
      const actual = await _.getNameFromOrcid('0000-0002-6109-0367' as Orcid)({
        fetch: fetchMock.sandbox().get('*', 200),
      })()

      expect(actual).toStrictEqual(E.right('Daniela Saderi'))
    })
    test('when the request fails', async () => {
      const actual = await _.getNameFromOrcid('0000-0002-6109-0367' as Orcid)({
        fetch: () => Promise.reject('network error'),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    })
  })

  test.prop([fc.orcid().filter(orcid => orcid !== '0000-0002-6109-0367')])(
    'when the ORCID iD is not 0000-0002-6109-0367',
    async orcid => {
      const actual = await _.getNameFromOrcid(orcid)({
        fetch: () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )
})
