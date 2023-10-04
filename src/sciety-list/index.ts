import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { notFound } from '../middleware'
import type { NonEmptyString } from '../string'

export interface ScietyListEnv {
  scietyListToken: NonEmptyString
}

const getAllPrereviews = () => TE.of(hardcoded)

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
  RM.ask<ScietyListEnv>(),
  RM.chain(env => RM.decodeHeader('Authorization', D.literal(`Bearer ${env.scietyListToken}`).decode)),
  RM.map(() => true),
  RM.orElse(() => RM.of(false)),
)

export const scietyList = pipe(
  isAllowed,
  RM.ichainW(isAllowed =>
    isAllowed
      ? pipe(
          RM.fromTaskEither(getAllPrereviews()),
          RM.ichainFirst(() => RM.status(Status.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(RM.closeHeaders),
          RM.ichain(prereviews => RM.send(JSON.stringify(prereviews))),
        )
      : pipe(notFound),
  ),
)
