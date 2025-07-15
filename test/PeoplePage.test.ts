import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import { Status } from 'hyper-ts'
import { Locale } from '../src/Context.js'
import { GetPageFromGhost, PageIsUnavailable } from '../src/GhostPage/index.js'
import * as _ from '../src/PeoplePage.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('PeoplePage', () => {
  test.prop([fc.supportedLocale()])('when the page cannot be loaded', async locale =>
    Effect.gen(function* () {
      const actual = yield* _.PeoplePage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(GetPageFromGhost, () => new PageIsUnavailable()),
      EffectTest.run,
    ),
  )
})
