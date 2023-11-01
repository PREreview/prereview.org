import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import type { HeadersOpen } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as D from 'io-ts/Decoder'
import * as _ from '../src/flash-message'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('deleteFlashMessage', () => {
  test.prop([
    fc.connection<HeadersOpen>({
      headers: fc.record({ Cookie: fc.string().map(message => `flash-message="${encodeURIComponent(message)}"`) }),
    }),
  ])('when there is a message', async connection => {
    const actual = await runMiddleware(_.deleteFlashMessage, connection)()

    expect(actual).toStrictEqual(E.right([{ type: 'clearCookie', name: 'flash-message', options: { httpOnly: true } }]))
  })

  test.prop([fc.connection<HeadersOpen>({ headers: fc.record({ Cookie: fc.string() }, { withDeletedKeys: true }) })])(
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
        { withDeletedKeys: true },
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

test.prop([fc.connection<HeadersOpen>(), fc.string()])('setFlashMessage', async (connection, message) => {
  const actual = await runMiddleware(_.setFlashMessage(message), connection)()

  expect(actual).toStrictEqual(
    E.right([{ type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: message }]),
  )
})
