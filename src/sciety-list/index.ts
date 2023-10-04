import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { notFound } from '../middleware'

const hardcoded = [
  {
    preprint: 'doi:10.1101/2023.07.21.23292937',
    createdAt: '2023-09-25T15:12:29.000Z',
    doi: '10.5281/zenodo.8377098',
    authors: [
      {
        name: 'Louis Fisher',
      },
      {
        name: 'Brian MacKenna',
      },
      {
        name: 'Helen Curtis',
      },
      {
        name: 'Rose Higgins',
      },
    ],
  },
]

const isAllowed = pipe(
  RM.decodeHeader('Authorization', D.string.decode),
  RM.map(() => true),
  RM.orElse(() => RM.of(false)),
)

export const scietyList = pipe(
  isAllowed,
  RM.ichain(isAllowed =>
    isAllowed
      ? pipe(
          RM.status(Status.OK),
          RM.ichain(() => RM.contentType('application/json')),
          RM.ichain(RM.closeHeaders),
          RM.ichain(() => RM.send(JSON.stringify(hardcoded))),
        )
      : pipe(notFound),
  ),
)
