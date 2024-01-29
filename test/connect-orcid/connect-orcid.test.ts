import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/connect-orcid'
import { connectOrcid } from '../../src/connect-orcid/connect-orcid'
import type { CanConnectOrcidProfileEnv } from '../../src/feature-flags'
import { connectOrcidMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('connectOrcid', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user()])('when ORCID can be connected', async user => {
      const canConnectOrcidProfile = jest.fn<CanConnectOrcidProfileEnv['canConnectOrcidProfile']>(_ => true)

      const actual = await _.connectOrcid({ user })({
        canConnectOrcidProfile,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(connectOrcidMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('Connect'),
        main: expect.stringContaining('Connect'),
        skipToLabel: 'main',
        js: [],
      })
      expect(canConnectOrcidProfile).toHaveBeenCalledWith(user)
    })

    test.prop([fc.user()])('when ORCID cannot be connected', async user => {
      const actual = await connectOrcid({ user })({
        canConnectOrcidProfile: () => false,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test('when the user is not logged in', async () => {
    const actual = await connectOrcid({})({
      canConnectOrcidProfile: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(connectOrcidMatch.formatter, {}),
    })
  })
})
