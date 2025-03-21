import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import { Status } from 'hyper-ts'
import { Locale } from '../src/Context.js'
import { GetPageFromGhost, PageIsNotFound, PageIsUnavailable } from '../src/GhostPage.js'
import * as _ from '../src/TrainingsPage.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('TrainingsPage', () => {
  test.prop([fc.supportedLocale(), fc.constantFrom(new PageIsUnavailable(), new PageIsNotFound())])(
    'when the page cannot be loaded',
    async (locale, error) =>
      Effect.gen(function* () {
        const actual = yield* _.TrainingsPage

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
        Effect.provideService(GetPageFromGhost, () => Effect.fail(error)),
        EffectTest.run,
      ),
  )
})
