import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, TestContext } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { LoggedInUser } from '../../src/Context.js'
import * as _ from '../../src/WriteFeedbackFlow/WriteFeedbackPage/index.js'
import * as fc from '../fc.js'

describe('WriteFeedbackPage', () => {
  test.prop([fc.user()])('when there is a user', user =>
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
    }).pipe(Effect.provideService(LoggedInUser, user), Effect.provide(TestContext.TestContext), Effect.runPromise),
  )

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
