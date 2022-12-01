import { Temporal } from '@js-temporal/polyfill'
import { Doi, hasRegistrant, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/Apply'
import * as A from 'fp-ts/Array'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { compose } from 'fp-ts/Refinement'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { LanguageCode } from 'iso-639-1'
import { get } from 'spectacles-ts'
import {
  DepositMetadata,
  Record,
  ZenodoAuthenticatedEnv,
  createDeposition,
  getRecord,
  getRecords,
  publishDeposition,
  uploadFile,
} from 'zenodo-ts'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { Html, plainText, sanitizeHtml } from './html'
import { PreprintId } from './preprint-id'
import { Prereview } from './review'
import { NewPrereview } from './write-review'

import PlainDate = Temporal.PlainDate

interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: PreprintId['doi']) => TE.TaskEither<unknown, { title: Html; language: LanguageCode }>
}

export const getPrereview = flow(
  getRecord,
  RTE.local(revalidateIfStale),
  RTE.local(useStaleCache),
  RTE.local(timeoutRequest(2000)),
  RTE.filterOrElseW(isInCommunity, () => new NotFound()),
  RTE.chain(recordToPrereview),
)

export const getPrereviews = flow(
  (preprint: PreprintId) =>
    new URLSearchParams({
      communities: 'prereview-reviews',
      q: `related.identifier:"${preprint.doi}"`,
      size: '100',
      sort: 'mostrecent',
    }),
  getRecords,
  RTE.local(revalidateIfStale),
  RTE.local(useStaleCache),
  RTE.local(timeoutRequest(2000)),
  RTE.bimap(
    () => 'unavailable' as const,
    flow(
      records => records.hits.hits,
      RA.map(record => ({
        authors: record.metadata.creators,
        id: record.id,
        text: sanitizeHtml(record.metadata.description),
      })),
    ),
  ),
)

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, unknown, Doi> = newPrereview =>
  pipe(
    createDepositMetadata(newPrereview),
    createDeposition,
    RTE.chainFirst(
      uploadFile({
        name: 'review.html',
        type: 'text/html',
        content: newPrereview.review.toString(),
      }),
    ),
    RTE.chain(publishDeposition),
    RTE.map(deposition => deposition.metadata.doi),
  )

function createDepositMetadata(newPrereview: NewPrereview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
    creators: [
      newPrereview.persona === 'public'
        ? { name: newPrereview.user.name, orcid: newPrereview.user.orcid }
        : { name: newPrereview.user.pseudonym },
    ],
    description: newPrereview.review.toString(),
    communities: [{ identifier: 'prereview-reviews' }],
    related_identifiers: [
      {
        scheme: 'doi',
        identifier: newPrereview.preprint.doi,
        relation: 'reviews',
        resource_type: 'publication-preprint',
      },
    ],
  }
}

function recordToPrereview(record: Record): RTE.ReaderTaskEither<F.FetchEnv & GetPreprintTitleEnv, unknown, Prereview> {
  return pipe(
    RTE.of(record),
    RTE.bindW('preprintDoi', RTE.fromOptionK(() => new NotFound())(getReviewedDoi)),
    RTE.bindW('reviewTextUrl', RTE.fromOptionK(() => new NotFound())(getReviewUrl)),
    RTE.bindW('license', RTE.fromEitherK(PrereviewLicenseD.decode)),
    RTE.chain(review =>
      sequenceS(RTE.ApplyPar)({
        authors: RTE.right(review.metadata.creators),
        doi: RTE.right(review.metadata.doi),
        license: RTE.right(review.license),
        postedDate: RTE.right(PlainDate.from(review.metadata.publication_date.toISOString().split('T')[0])),
        preprint: RTE.asksReaderTaskEither(
          flow(
            RTE.fromTaskEitherK(({ getPreprintTitle }: F.FetchEnv & GetPreprintTitleEnv) =>
              getPreprintTitle(review.preprintDoi),
            ),
            RTE.let('doi', () => review.preprintDoi),
          ),
        ),
        text: getReviewText(review.reviewTextUrl),
      }),
    ),
  )
}

const DoiD = D.fromRefinement(
  pipe(
    isDoi,
    compose(hasRegistrant('1101', '1590', '21203', '31219', '31223', '31224', '31234', '31235', '31730', '35542')),
  ),
  'DOI',
)

const PrereviewLicenseD: D.Decoder<Record, Prereview['license']> = pipe(
  D.fromStruct({ metadata: D.fromStruct({ license: D.fromStruct({ id: D.literal('CC-BY-4.0') }) }) }),
  D.map(get('metadata.license.id')),
)

function isInCommunity(record: Record) {
  return pipe(
    O.fromNullable(record.metadata.communities),
    O.chain(A.findFirst(community => community.id === 'prereview-reviews')),
    O.isSome,
  )
}

const getReviewUrl = flow(
  (record: Record) => record.files,
  RA.findFirst(file => file.type === 'html'),
  O.map(get('links.self')),
)

const getReviewText = flow(
  F.Request('GET'),
  F.send,
  RTE.local(useStaleCache),
  RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'no text'),
  RTE.chainTaskEitherK(F.getText(identity)),
  RTE.map(sanitizeHtml),
)

const getReviewedDoi = flow(
  O.fromNullableK((record: Record) => record.metadata.related_identifiers),
  O.chain(
    A.findFirst(
      identifier =>
        identifier.relation === 'reviews' &&
        identifier.scheme === 'doi' &&
        identifier.resource_type === 'publication-preprint',
    ),
  ),
  O.chainEitherK(flow(get('identifier'), DoiD.decode)),
)
