import { Temporal } from '@js-temporal/polyfill'
import { Work, getWork } from 'crossref-ts'
import { Doi, hasRegistrant, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/Apply'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { compose } from 'fp-ts/Refinement'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { LanguageCode } from 'iso-639-1'
import sanitize from 'sanitize-html'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import {
  DepositMetadata,
  Record,
  SubmittedDeposition,
  ZenodoAuthenticatedEnv,
  createDeposition,
  getRecord,
  publishDeposition,
  uploadFile,
} from 'zenodo-ts'
import { Html, plainText, rawHtml, sanitizeHtml } from './html'
import { Preprint } from './preprint'
import { Prereview } from './review'
import { NewPrereview } from './write-review'

import PlainDate = Temporal.PlainDate

interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: Doi<'1101'>) => TE.TaskEither<unknown, { title: Html; language: LanguageCode }>
}

export const getPreprint = flow(getWork, RTE.chainEitherK(workToPreprint))

export const getPreprintTitle = flow(
  getPreprint,
  RTE.map(preprint => ({ language: preprint.language, title: preprint.title })),
)

export const getPrereview = flow(
  getRecord,
  RTE.filterOrElseW(isInCommunity, () => new NotFound()),
  RTE.chain(recordToPrereview),
)

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, unknown, SubmittedDeposition> = newPrereview =>
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
  )

function createDepositMetadata(newPrereview: NewPrereview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
    creators: [newPrereview.persona === 'public' ? newPrereview.user : { name: 'PREreviewer' }],
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

function workToPreprint(work: Work): E.Either<unknown, Preprint> {
  return pipe(
    E.Do,
    E.apS(
      'abstract',
      pipe(
        work.abstract,
        E.fromNullable(() => 'no abstract'),
        E.map(transformJatsToHtml),
      ),
    ),
    E.apSW(
      'authors',
      pipe(
        work.author,
        RA.map(author =>
          match(author)
            .with({ name: P.string }, author => ({
              name: author.name,
            }))
            .with({ family: P.string }, author => ({
              name: [author.prefix, author.given, author.family, author.suffix].filter(isString).join(' '),
              orcid: author.ORCID,
            }))
            .exhaustive(),
        ),
        E.fromPredicate(RA.isNonEmpty, () => 'no authors'),
      ),
    ),
    E.apSW(
      'doi',
      pipe(
        work.DOI,
        E.fromPredicate(hasRegistrant('1101'), () => 'not a DOI'),
      ),
    ),
    E.apSW(
      'posted',
      pipe(
        work.published,
        E.fromPredicate(
          (date): date is PlainDate => date instanceof PlainDate,
          () => 'no published date',
        ),
      ),
    ),
    E.apSW('server', pipe(work, ServerD.decode)),
    E.apSW('title', pipe(work.title, E.fromOptionK(() => 'no title')(RA.head), E.map(sanitizeHtml))),
    E.map(preprint => ({
      ...preprint,
      language: 'en',
      url: toHttps(work.resource.primary.URL),
    })),
  )
}

function recordToPrereview(record: Record): RTE.ReaderTaskEither<F.FetchEnv & GetPreprintTitleEnv, unknown, Prereview> {
  return pipe(
    RTE.of(record),
    RTE.bindW('preprintDoi', RTE.fromOptionK(() => new NotFound())(getReviewedDoi)),
    RTE.bindW('reviewTextUrl', RTE.fromOptionK(() => new NotFound())(getReviewUrl)),
    RTE.chain(review =>
      sequenceS(RTE.ApplyPar)({
        authors: RTE.right(review.metadata.creators),
        doi: RTE.right(review.metadata.doi),
        postedDate: RTE.right(PlainDate.from(review.metadata.publication_date.toISOString().split('T')[0])),
        preprint: RTE.asksReaderTaskEither(
          flow(
            RTE.fromTaskEitherK(({ getPreprintTitle }) => getPreprintTitle(review.preprintDoi)),
            RTE.apSW('doi', RTE.right(review.preprintDoi)),
          ),
        ),
        text: getReviewText(review),
      }),
    ),
  )
}

function transformJatsToHtml(jats: string): Html {
  const sanitized = sanitize(jats, {
    allowedAttributes: {
      '*': ['dir', 'lang'],
      a: ['href'],
    },
    exclusiveFilter: frame =>
      frame.tag === 'jats:title' &&
      (frame.text.toLowerCase() === 'abstract' || frame.text.toLowerCase() === 'graphical abstract'),
    transformTags: {
      'jats:ext-link': (_, attribs) => {
        if (attribs['ext-link-type'] !== 'uri') {
          return { tagName: 'a', attribs }
        }

        return { tagName: 'a', attribs: { ...attribs, href: attribs['xlink:href'] } }
      },
      'jats:italic': 'i',
      'jats:p': 'p',
      'jats:related-object': (_, attribs) => {
        if (attribs['ext-link-type'] !== 'uri') {
          return { tagName: 'a', attribs }
        }

        return { tagName: 'a', attribs: { ...attribs, href: attribs['xlink:href'] } }
      },
      'jats:sub': 'sub',
      'jats:sup': 'sup',
      'jats:title': 'h4',
    },
  })

  return rawHtml(sanitized)
}

function toHttps(url: URL): URL {
  const httpsUrl = new URL(url)
  httpsUrl.protocol = 'https'

  return httpsUrl
}

const ServerD = pipe(
  D.struct({ institution: D.tuple(D.struct({ name: D.literal('bioRxiv', 'medRxiv') })) }),
  D.map(get('institution.[0].name')),
)

const DoiD = D.fromRefinement(pipe(isDoi, compose(hasRegistrant('1101'))), 'DOI')

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
  RTE.fromOptionK(() => ({ status: Status.NotFound }))(getReviewUrl),
  RTE.chainW(flow(F.Request('GET'), F.send)),
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
