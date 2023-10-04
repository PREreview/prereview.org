import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { LoggerEnv } from 'logger-fp-ts'
import type { ZenodoEnv } from 'zenodo-ts'
import type { GetPreprintTitleEnv } from '../preprint'
import type { NonEmptyString } from '../string'
import { getRecentPrereviewsFromZenodo } from '../zenodo'

export interface ScietyListEnv {
  scietyListToken: NonEmptyString
}

interface Prereview {
  preprint: string
  createdAt: string
  doi: string
  authors: ReadonlyArray<{ name: string }>
}

const getAllPrereviews = (): RTE.ReaderTaskEither<
  ZenodoEnv & GetPreprintTitleEnv & LoggerEnv,
  never,
  ReadonlyArray<Prereview>
> =>
  pipe(
    getRecentPrereviewsFromZenodo(1),
    RTE.map(data => data.recentPrereviews),
    RTE.map(
      RA.map(prereview => ({
        preprint: prereview.preprint.id.value.toString(),
        createdAt: prereview.published.toString(),
        doi: `10.5281/zenode.${prereview.id}`,
        authors: pipe(
          prereview.reviewers,
          RA.map(reviewer => ({ name: reviewer })),
        ),
      })),
    ),
    RTE.orElseW(() => RTE.of([])),
  )

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
          RM.fromReaderTaskEither(getAllPrereviews()),
          RM.ichainFirstW(() => RM.status(Status.OK)),
          RM.ichainFirstW(() => RM.contentType('application/json')),
          RM.ichainFirstW(RM.closeHeaders),
          RM.ichainW(prereviews => RM.send(JSON.stringify(prereviews))),
        )
      : pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
  ),
)
