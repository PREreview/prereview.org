import { Temporal } from '@js-temporal/polyfill'
import { Work, getWork } from 'crossref-ts'
import { hasRegistrant } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import * as D from 'io-ts/Decoder'
import sanitize from 'sanitize-html'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import {
  DepositMetadata,
  SubmittedDeposition,
  ZenodoAuthenticatedEnv,
  createDeposition,
  publishDeposition,
  uploadFile,
} from 'zenodo-ts'
import { Html, plainText, rawHtml, sanitizeHtml } from './html'
import { Preprint } from './preprint'
import { NewPrereview } from './write-review'

import PlainDate = Temporal.PlainDate

export const getPreprint = flow(getWork, RTE.chainEitherK(workToPreprint))

export const getPreprintTitle = flow(
  getPreprint,
  RTE.map(preprint => preprint.title),
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
    title: plainText`Review of “${newPrereview.preprint.title}”`.toString(),
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
      url: toHttps(work.resource.primary.URL),
    })),
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
