import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../src/home'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('home', () => {
  test.prop([fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') })])(
    'home',
    async connection => {
      const actual = await runMiddleware(_.home({}), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  describe('looking up a preprint', () => {
    test.prop([
      fc
        .preprintDoi()
        .chain(preprint =>
          fc.tuple(
            fc.constant(preprint),
            fc.connection({ body: fc.constant({ preprint }), method: fc.constant('POST') }),
          ),
        ),
    ])('with a preprint DOI', async ([doi, connection]) => {
      const actual = await runMiddleware(_.home({}), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'))}`,
          },
          { type: 'endResponse' },
        ]),
      )
    })

    test.prop([
      fc.connection({
        body: fc.record({ doi: fc.oneof(fc.string(), fc.doi()) }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
    ])('with a non-preprint DOI', async connection => {
      const actual = await runMiddleware(_.home({}), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })
  })
})
