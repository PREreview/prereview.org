import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import type { GetPageFromGhostEnv } from '../src/GhostPage.js'
import * as _ from '../src/people.js'
import { peopleMatch } from '../src/routes.js'
import * as fc from './fc.js'

describe('people', () => {
  test.prop([fc.supportedLocale(), fc.html()])('when the page can be loaded', async (locale, page) => {
    const getPageFromGhost = jest.fn<GetPageFromGhostEnv['getPageFromGhost']>(_ => TE.right(page))

    const actual = await _.people(locale)({ getPageFromGhost })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(peopleMatch.formatter, {}),
      current: 'people',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(getPageFromGhost).toHaveBeenCalledWith('6154aa157741400e8722bb0a')
  })

  test.prop([fc.supportedLocale(), fc.constantFrom('unavailable', 'not-found')])(
    'when the page cannot be loaded',
    async (locale, error) => {
      const actual = await _.people(locale)({ getPageFromGhost: () => TE.left(error) })()

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
