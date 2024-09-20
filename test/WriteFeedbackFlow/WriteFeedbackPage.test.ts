import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { LoggedInUser } from '../../src/Context.js'
import { CanWriteFeedback } from '../../src/feature-flags.js'
import * as _ from '../../src/WriteFeedbackFlow/WriteFeedbackPage/index.js'
import * as fc from '../fc.js'

describe('WriteFeedbackPage', () => {
  describe('when there is a user', () => {
    test.prop([fc.user()])('when the user can write feedback', user =>
      Effect.gen(function* () {
        const actual = yield* _.WriteFeedbackPage()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.SERVICE_UNAVAILABLE,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(CanWriteFeedback, () => true),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )

    test.prop([fc.user()])('when the user cannot write feedback', user =>
      Effect.gen(function* () {
        const actual = yield* _.WriteFeedbackPage()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NOT_FOUND,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(CanWriteFeedback, () => false),
        Effect.provideService(LoggedInUser, user),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
    )
  })

  test("when there isn't a user", () =>
    Effect.gen(function* () {
      const actual = yield* _.WriteFeedbackPage()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise))
})
