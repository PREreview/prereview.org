import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../src/home'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('home', () => {
  test('home', async () => {
    await fc.assert(
      fc.asyncProperty(fc.connection(), async connection => {
        const actual = await runMiddleware(_.home({}), connection)()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      }),
    )
  })
})
