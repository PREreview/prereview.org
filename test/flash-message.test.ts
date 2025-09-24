import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import type { HeadersOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../src/flash-message.ts'
import * as fc from './fc.ts'
import { runMiddleware } from './middleware.ts'

describe('deleteFlashMessage', () => {
  test.prop([
    fc.connection<HeadersOpen>({
      headers: fc.record({ Cookie: fc.string().map(message => `flash-message="${encodeURIComponent(message)}"`) }),
    }),
  ])('when there is a message', async connection => {
    const actual = await runMiddleware(_.deleteFlashMessage, connection)()

    expect(actual).toStrictEqual(E.right([{ type: 'clearCookie', name: 'flash-message', options: { httpOnly: true } }]))
  })

  test.prop([fc.connection<HeadersOpen>({ headers: fc.record({ Cookie: fc.string() }, { requiredKeys: [] }) })])(
    "when there isn't a message",
    async connection => {
      const actual = await runMiddleware(_.deleteFlashMessage, connection)()

      expect(actual).toStrictEqual(E.right([]))
    },
  )
})

describe('getFlashMessage', () => {
  test.prop([
    fc
      .string()
      .chain(message =>
        fc.tuple(
          fc.constant(message),
          fc.connection({ headers: fc.constant({ Cookie: `flash-message="${encodeURIComponent(message)}"` }) }),
        ),
      ),
  ])('when the message can be decoded', async ([message, connection]) => {
    const actual = await M.evalMiddleware(_.getFlashMessage(D.literal(message)), connection)()

    expect(actual).toStrictEqual(E.right(message))
  })

  test.prop([
    fc.connection({
      headers: fc.record(
        {
          Cookie: fc.oneof(
            fc.string(),
            fc.string().map(message => `flash-message="${encodeURIComponent(message)}"`),
          ),
        },
        { requiredKeys: [] },
      ),
    }),
  ])("when the message can't be decoded", async connection => {
    const actual = await M.evalMiddleware(
      _.getFlashMessage({ decode: () => D.failure('value', 'message') }),
      connection,
    )()

    expect(actual).toStrictEqual(E.right(undefined))
  })
})

test.prop([fc.connection<HeadersOpen>(), fc.flashMessage()])('setFlashMessage', async (connection, message) => {
  const actual = await runMiddleware(_.setFlashMessage(message), connection)()

  expect(actual).toStrictEqual(
    E.right([{ type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: message }]),
  )
})
