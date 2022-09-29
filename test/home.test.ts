import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as _ from '../src/home'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('home', () => {
  test('home', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
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
      ),
    )
  })

  describe('looking up a DOI', () => {
    test('with a preprint DOI', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .preprintDoi()
            .chain(doi =>
              fc.tuple(fc.constant(doi), fc.connection({ body: fc.constant({ doi }), method: fc.constant('POST') })),
            ),
          async ([doi, connection]) => {
            const actual = await runMiddleware(_.home({}), connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: `/preprints/doi-${encodeURIComponent(
                    doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                  )}`,
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('with a non-preprint DOI', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.connection({
            body: fc.record({ doi: fc.oneof(fc.string(), fc.doi()) }, { withDeletedKeys: true }),
            method: fc.constant('POST'),
          }),
          async connection => {
            const actual = await runMiddleware(_.home({}), connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                { type: 'setHeader', name: 'Location', value: '/' },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })
  })
})
