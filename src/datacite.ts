import { Temporal } from '@js-temporal/polyfill'
import { Work, getWork } from 'datacite-ts'
import { Doi, hasRegistrant } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as R from 'fp-ts/Refinement'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { sanitizeHtml } from './html'
import { Preprint } from './preprint'
import { ArxivPreprintId } from './preprint-id'

import Instant = Temporal.Instant

export type DatacitePreprintId = ArxivPreprintId

export const isDatacitePreprintDoi: R.Refinement<Doi, DatacitePreprintId['doi']> = hasRegistrant('48550')

export const getPreprintFromDatacite = flow(
  (doi: DatacitePreprintId['doi']) => getWork(doi),
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainEitherKW(dataciteWorkToPreprint),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: Status.NotFound }, () => 'not-found' as const)
      .otherwise(() => 'unavailable' as const),
  ),
)

function dataciteWorkToPreprint(work: Work): E.Either<D.DecodeError | string, Preprint> {
  return pipe(
    E.Do,
    E.filterOrElse(
      () => work.types.resourceTypeGeneral === 'Preprint' || work.types.resourceTypeGeneral === 'Text',
      () => 'not a preprint',
    ),
    E.apSW(
      'authors',
      pipe(
        work.creators,
        RA.map(author =>
          match(author)
            .with({ givenName: P.string, familyName: P.string }, author => ({
              name: `${author.givenName} ${author.familyName}`,
            }))
            .with({ familyName: P.string }, author => ({
              name: author.familyName,
            }))
            .with({ name: P.string }, author => ({
              name: author.name,
            }))
            .exhaustive(),
        ),
        E.fromPredicate(RA.isNonEmpty, () => 'no authors'),
      ),
    ),
    E.apSW('id', PreprintIdD.decode(work)),
    E.apSW(
      'posted',
      pipe(
        work.dates,
        E.fromOptionK(() => 'no published date' as const)(
          RA.findFirst(
            R.fromOptionK(date =>
              pipe(
                O.Do,
                O.apS('dateType', date.dateType === 'Submitted' ? O.some(date.dateType) : O.none),
                O.apS('date', date.date instanceof Instant ? O.some(date.date) : O.none),
              ),
            ),
          ),
        ),
        E.map(date => date.date.toZonedDateTimeISO('UTC').toPlainDate()),
      ),
    ),
    E.bindW('abstract', ({ id: { type } }) =>
      pipe(
        work.descriptions,
        E.fromOptionK(() => 'no abstract' as const)(
          RA.findFirst(({ descriptionType }) => descriptionType === 'Abstract'),
        ),
        E.map(({ description }) => sanitizeHtml(`<p>${description}</p>`)),
        E.bindTo('text'),
        E.bindW(
          'language',
          E.fromOptionK(() => 'unknown language' as const)(({ text }) =>
            match({ type, text })
              .with({ type: 'arxiv' }, () => O.some('en' as const))
              .exhaustive(),
          ),
        ),
        E.orElseW(error =>
          match(error)
            .with('no abstract', () => E.right(undefined))
            .with('unknown language', E.left)
            .exhaustive(),
        ),
      ),
    ),
    E.bindW('title', ({ id: { type } }) =>
      pipe(
        E.right(work.titles[0].title),
        E.map(sanitizeHtml),
        E.bindTo('text'),
        E.bind(
          'language',
          E.fromOptionK(() => 'unknown language')(({ text }) =>
            match({ type, text })
              .with({ type: 'arxiv' }, () => O.some('en' as const))
              .exhaustive(),
          ),
        ),
      ),
    ),
    E.let('url', () => work.url),
  )
}

const PreprintIdD: D.Decoder<Work, DatacitePreprintId> = pipe(
  D.fromStruct({
    doi: D.fromRefinement(hasRegistrant('48550'), 'DOI'),
    publisher: D.literal('arXiv'),
  }),
  D.map(
    work =>
      ({
        type: 'arxiv',
        doi: work.doi,
      } satisfies ArxivPreprintId),
  ),
)
