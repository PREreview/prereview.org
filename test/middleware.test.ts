import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/middleware'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('middleware', () => {
  test('seeOther', async () => {
    await fc.assert(
      fc.asyncProperty(fc.connection(), fc.string(), async (connection, location) => {
        const actual = await runMiddleware(_.seeOther(location), connection)()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            { type: 'setHeader', name: 'Location', value: location },
            { type: 'endResponse' },
          ]),
        )
      }),
    )
  })
})
