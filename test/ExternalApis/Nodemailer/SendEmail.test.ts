import { Deferred, Effect, Fiber } from 'effect'
import { createTransport } from 'nodemailer'
import { layerTransporter } from '../../../src/ExternalApis/Nodemailer/Nodemailer.ts'
import * as _ from '../../../src/ExternalApis/Nodemailer/SendEmail.ts'
import * as fc from '../../fc.ts'
import { describe, expect, it } from '../../vitest.ts'

describe('SendEmail', () => {
  it.effect.prop('aborts sending when interrupted', [fc.email()], ([email]) =>
    Effect.gen(function* () {
      const signal = yield* Deferred.make<AbortSignal | undefined>()

      const transporter = createTransport({
        name: 'test',
        version: '1',
        send: mail => {
          Deferred.doneUnsafe(signal, Effect.succeed(mail.data.signal))
        },
      })

      const fiber = yield* Effect.forkChild(_.SendEmail(email).pipe(Effect.provide(layerTransporter(transporter))))
      const actual = yield* Deferred.await(signal)
      yield* Fiber.interrupt(fiber)

      expect(actual?.aborted).toBe(true)
    }),
  )
})
