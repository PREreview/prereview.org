import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import type { GetPageFromGhostEnv } from '../src/GhostPage.js'
import { trainingsMatch } from '../src/routes.js'
import * as _ from '../src/trainings.js'
import * as fc from './fc.js'

describe('trainings', () => {
  test.prop([fc.html()])('when the page can be loaded', async page => {
    const getPageFromGhost = jest.fn<GetPageFromGhostEnv['getPageFromGhost']>(_ => TE.right(page))

    const actual = await _.trainings({ getPageFromGhost })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(trainingsMatch.formatter, {}),
      current: 'trainings',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(getPageFromGhost).toHaveBeenCalledWith('64639b5007fb34a92c7f8518')
  })

  test.prop([fc.constantFrom('unavailable', 'not-found')])('when the page cannot be loaded', async error => {
    const actual = await _.trainings({ getPageFromGhost: () => TE.left(error) })()

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
