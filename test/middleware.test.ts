import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../src/middleware'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('middleware', () => {
  fc.test('seeOther', [fc.connection(), fc.string()], async (connection, location) => {
    const actual = await runMiddleware(_.seeOther(location), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        { type: 'setHeader', name: 'Location', value: location },
        { type: 'endResponse' },
      ]),
    )
  })

  fc.test('notFound', [fc.connection()], async connection => {
    const actual = await runMiddleware(_.notFound({}), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  fc.test('serviceUnavailable', [fc.connection()], async connection => {
    const actual = await runMiddleware(_.serviceUnavailable({}), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})
