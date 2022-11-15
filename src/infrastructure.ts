import { Temporal } from '@js-temporal/polyfill'
import { Work, getWork } from 'crossref-ts'
import { Doi, hasRegistrant, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import { sequenceS } from 'fp-ts/Apply'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { compose } from 'fp-ts/Refinement'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, flow, identity, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { NotFound } from 'http-errors'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { LanguageCode } from 'iso-639-1'
import * as L from 'logger-fp-ts'
import sanitize from 'sanitize-html'
import { get } from 'spectacles-ts'
import { detect } from 'tinyld'
import { P, match } from 'ts-pattern'
import {
  DepositMetadata,
  Record,
  ZenodoAuthenticatedEnv,
  ZenodoEnv,
  createDeposition,
  getRecord,
  getRecords,
  publishDeposition,
  uploadFile,
} from 'zenodo-ts'
import { Html, plainText, rawHtml, sanitizeHtml } from './html'
import { Preprint } from './preprint'
import { AfricarxivPreprintId, BiorxivPreprintId, MedrxivPreprintId, PreprintId, ScieloPreprintId } from './preprint-id'
import { Prereview } from './review'
import { NewPrereview } from './write-review'

import PlainDate = Temporal.PlainDate

interface GetPreprintTitleEnv {
  getPreprintTitle: (doi: PreprintId['doi']) => TE.TaskEither<unknown, { title: Html; language: LanguageCode }>
}

export const getPreprint = flow(
  getWork,
  RTE.local(revalidateIfStale),
  RTE.local(useStaleCache),
  RTE.local(timeoutRequest(2000)),
  RTE.chainEitherKW(workToPreprint),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: Status.NotFound }, () => 'not-found' as const)
      .otherwise(() => 'unavailable' as const),
  ),
)

export const getPreprintTitle = flow(
  getPreprint,
  RTE.local(useStaleCache),
  RTE.map(preprint => ({ language: preprint.title.language, title: preprint.title.text })),
)

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
      ...newPrereview.otherAuthors,
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

function workToPreprint(work: Work): E.Either<D.DecodeError | string, Preprint> {
  return pipe(
    E.Do,
    E.filterOrElse(
      () => work.type === 'posted-content' && work.subtype === 'preprint',
      () => 'not a preprint',
    ),
    E.apS(
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
    E.apSW('id', PreprintIdD.decode(work)),
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
    E.bindW('abstract', ({ id: { type } }) =>
      pipe(
        work.abstract,
        E.fromNullable('no abstract'),
        E.map(transformJatsToHtml),
        E.bindTo('text'),
        E.bindW(
          'language',
          E.fromOptionK(() => 'unknown language')(({ text }) =>
            match({ type, text })
              .with({ type: 'africarxiv', text: P.select() }, detectLanguage('en', 'fr'))
              .with({ type: P.union('biorxiv', 'medrxiv') }, () => O.some('en' as const))
              .with({ type: 'scielo', text: P.select() }, detectLanguage('en', 'es', 'pt'))
              .exhaustive(),
          ),
        ),
      ),
    ),
    E.bindW('title', preprint =>
      pipe(
        work.title,
        E.fromOptionK(() => 'no title')(RA.head),
        E.map(sanitizeHtml),
        E.bindTo('text'),
        E.bind(
          'language',
          E.fromOptionK(() => 'unknown language')(({ text }) =>
            match({ type: preprint.id.type, text })
              .with({ type: 'africarxiv', text: P.select() }, detectLanguage('en', 'fr'))
              .otherwise(() => O.some(preprint.abstract.language)),
          ),
        ),
      ),
    ),
    E.let('url', () => toHttps(work.resource.primary.URL)),
  )
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

const DoiD = D.fromRefinement(pipe(isDoi, compose(hasRegistrant('1101', '1590', '31730'))), 'DOI')

const PreprintIdD: D.Decoder<Work, AfricarxivPreprintId | BiorxivPreprintId | MedrxivPreprintId | ScieloPreprintId> =
  pipe(
    D.union(
      D.struct({
        DOI: D.fromRefinement(pipe(isDoi, compose(hasRegistrant('31730'))), 'DOI'),
        publisher: D.literal('Center for Open Science'),
        'group-title': D.literal('AfricArXiv'),
      }),
      D.struct({
        DOI: D.fromRefinement(pipe(isDoi, compose(hasRegistrant('1101'))), 'DOI'),
        publisher: D.literal('Cold Spring Harbor Laboratory'),
        institution: D.tuple(D.struct({ name: D.literal('bioRxiv', 'medRxiv') })),
      }),
      D.struct({
        DOI: D.fromRefinement(pipe(isDoi, compose(hasRegistrant('1590'))), 'DOI'),
        publisher: D.literal('FapUNIFESP (SciELO)'),
      }),
    ),
    D.map(work =>
      match(work)
        .with({ DOI: P.select(), publisher: 'Center for Open Science', 'group-title': 'AfricArXiv' }, doi => ({
          type: 'africarxiv' as const,
          doi,
        }))
        .with(
          { DOI: P.select(), publisher: 'Cold Spring Harbor Laboratory', institution: [{ name: 'bioRxiv' }] },
          doi => ({ type: 'biorxiv' as const, doi }),
        )
        .with(
          { DOI: P.select(), publisher: 'Cold Spring Harbor Laboratory', institution: [{ name: 'medRxiv' }] },
          doi => ({ type: 'medrxiv' as const, doi }),
        )
        .with({ DOI: P.select(), publisher: 'FapUNIFESP (SciELO)' }, doi => ({ type: 'scielo' as const, doi }))
        .exhaustive(),
    ),
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

function detectLanguage<L extends LanguageCode>(...languages: ReadonlyArray<L>): (html: Html) => O.Option<L> {
  return flow(
    html => detect(plainText(html).toString(), { only: [...languages] }) as L,
    O.fromPredicate(detected => languages.includes(detected)),
  )
}

function useStaleCache(env: ZenodoEnv): ZenodoEnv
function useStaleCache(env: F.FetchEnv): F.FetchEnv
function useStaleCache<E extends F.FetchEnv>(env: E): E {
  return { ...env, fetch: (url, init) => env.fetch(url, { cache: 'force-cache', ...init }) }
}

function revalidateIfStale(env: ZenodoEnv): ZenodoEnv
function revalidateIfStale(env: F.FetchEnv): F.FetchEnv
function revalidateIfStale<E extends F.FetchEnv>(env: E): E {
  return {
    ...env,
    fetch: async (url, init) => {
      const response = await env.fetch(url, init)

      if (response.headers.get('x-local-cache-status') === 'stale') {
        void env
          .fetch(url, { ...init, cache: 'no-cache' })
          .then(response => response.text())
          .catch(constVoid)
      }

      return response
    },
  }
}

export function timeoutRequest<E extends F.FetchEnv>(timeout: number): (env: E) => E {
  return env => ({
    ...env,
    fetch: async (url, init) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        return await env.fetch(url, { signal: controller.signal, ...init })
      } finally {
        clearTimeout(timeoutId)
      }
    },
  })
}

export function logFetch<E extends F.FetchEnv & L.LoggerEnv>(env: E): E {
  return {
    ...env,
    fetch: async (url, init) => {
      L.debugP('Sending HTTP request')({
        url,
        method: init.method,
      })(env)()

      const startTime = Date.now()
      return env
        .fetch(url, init)
        .then(response => {
          const endTime = Date.now()

          L.debugP('Received HTTP response')({
            url: response.url,
            method: init.method,
            status: response.status,
            headers: [...response.headers],
            time: endTime - startTime,
          })(env)()

          return response
        })
        .catch(error => {
          const endTime = Date.now()

          L.debugP('Did not receive a HTTP response')({
            url,
            method: init.method,
            time: endTime - startTime,
          })(env)()

          throw error
        })
    },
  }
}
