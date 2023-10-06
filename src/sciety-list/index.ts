import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { constVoid, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import type { LoggerEnv } from 'logger-fp-ts'
import { match } from 'ts-pattern'
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
  RM.bimap(() => 'forbidden' as const, constVoid),
)

export const scietyList = pipe(
  isAllowed,
  RM.chainReaderTaskEitherKW(getAllPrereviews),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirst(() => RM.contentType('application/json')),
  RM.ichainFirst(() => RM.closeHeaders()),
  RM.ichain(prereviews => RM.send(JSON.stringify(prereviews))),
  RM.orElseW(error =>
    match(error)
      .with('forbidden', () => pipe(RM.status(Status.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)))
      .exhaustive(),
  ),
)
