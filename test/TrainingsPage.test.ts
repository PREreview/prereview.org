import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../src/Context.ts'
import { GetPageFromGhost, PageIsUnavailable } from '../src/GhostPage/index.ts'
import * as StatusCodes from '../src/StatusCodes.ts'
import * as _ from '../src/TrainingsPage.ts'
import * as EffectTest from './EffectTest.ts'
import * as fc from './fc.ts'

describe('TrainingsPage', () => {
  test.prop([fc.supportedLocale()])('when the page cannot be loaded', async locale =>
    Effect.gen(function* () {
      const actual = yield* _.TrainingsPage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
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
