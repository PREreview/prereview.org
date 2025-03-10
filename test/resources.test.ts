import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import type { GetPageFromGhostEnv } from '../src/GhostPage.js'
import * as _ from '../src/resources.js'
import { resourcesMatch } from '../src/routes.js'
import * as fc from './fc.js'

describe('resources', () => {
  test.prop([fc.supportedLocale(), fc.html()])('when the page can be loaded', async (locale, page) => {
    const getPageFromGhost = jest.fn<GetPageFromGhostEnv['getPageFromGhost']>(_ => TE.right(page))

    const actual = await _.resources(locale)({ getPageFromGhost })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(resourcesMatch.formatter, {}),
      current: 'resources',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(getPageFromGhost).toHaveBeenCalledWith('6526c6ae07fb34a92c7f8d6f')
  })

  test.prop([fc.supportedLocale(), fc.constantFrom('unavailable', 'not-found')])(
    'when the page cannot be loaded',
    async (locale, error) => {
      const actual = await _.resources(locale)({ getPageFromGhost: () => TE.left(error) })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )
})
