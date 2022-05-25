import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import all from 'it-all'
import Keyv from 'keyv'
import * as _ from '../src/log-in'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('log-in', () => {
  test('logIn', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), fc.connection(), async (secret, connection) => {
        const sessionStore = new Keyv()

        const actual = await runMiddleware(_.logIn({ secret, sessionStore }), connection)()
        const sessions = await all(sessionStore.iterator(undefined))

        expect(sessions).toStrictEqual([[expect.anything(), { name: 'Josiah Carberry', orcid: '0000-0002-1825-0097' }]])
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.Found },
            { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
            {
              type: 'setCookie',
              name: 'session',
              options: expect.anything(),
              value: expect.stringMatching(new RegExp(`^${sessions[0][0]}\\.`)),
            },
            { type: 'endResponse' },
          ]),
        )
      }),
    )
  })
})
