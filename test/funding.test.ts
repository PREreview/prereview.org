import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as _ from '../src/funding.js'
import type { GetPageFromGhostEnv } from '../src/GhostPage.js'
import { fundingMatch } from '../src/routes.js'
import * as fc from './fc.js'

describe('funding', () => {
  test.prop([fc.html()])('when the page can be loaded', async page => {
    const getPageFromGhost = jest.fn<GetPageFromGhostEnv['getPageFromGhost']>(_ => TE.right(page))

    const actual = await _.funding({ getPageFromGhost })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(fundingMatch.formatter, {}),
      current: 'funding',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(getPageFromGhost).toHaveBeenCalledWith('6154aa157741400e8722bb12')
  })

  test.prop([fc.constantFrom('unavailable', 'not-found')])('when the page cannot be loaded', async error => {
    const actual = await _.funding({ getPageFromGhost: () => TE.left(error) })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})
