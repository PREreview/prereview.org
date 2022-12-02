import { Temporal } from '@js-temporal/polyfill'
import { Work, getWork } from 'crossref-ts'
import { Doi, hasRegistrant } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { Refinement } from 'fp-ts/Refinement'
import { flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import sanitize from 'sanitize-html'
import { P, match } from 'ts-pattern'
import { detectLanguage, detectLanguageFrom } from './detect-language'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { Html, rawHtml, sanitizeHtml } from './html'
import { Preprint } from './preprint'
import {
  AfricarxivPreprintId,
  BiorxivPreprintId,
  EartharxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  MedrxivPreprintId,
  OsfPreprintId,
  PsyarxivPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  SocarxivPreprintId,
} from './preprint-id'

import PlainDate = Temporal.PlainDate

export type CrossrefPreprintId =
  | AfricarxivPreprintId
  | BiorxivPreprintId
  | EartharxivPreprintId
  | EdarxivPreprintId
  | EngrxivPreprintId
  | MedrxivPreprintId
  | OsfPreprintId
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | SocarxivPreprintId

export const isCrossrefPreprintDoi: Refinement<Doi, CrossrefPreprintId['doi']> = hasRegistrant(
  '1101',
  '1590',
  '21203',
  '31219',
  '31223',
  '31224',
  '31234',
  '31235',
  '31730',
  '35542',
)

export const getPreprintFromCrossref = flow(
  (doi: CrossrefPreprintId['doi']) => getWork(doi),
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
        E.fromNullable('no abstract' as const),
        E.map(transformJatsToHtml),
        E.bindTo('text'),
        E.bindW(
          'language',
          E.fromOptionK(() => 'unknown language' as const)(({ text }) =>
            match({ type, text })
              .with({ type: 'africarxiv', text: P.select() }, detectLanguageFrom('en', 'fr'))
              .with({ type: P.union('biorxiv', 'medrxiv') }, () => O.some('en' as const))
              .with({ type: 'eartharxiv' }, () => O.some('en' as const))
              .with({ type: 'edarxiv', text: P.select() }, detectLanguage)
              .with({ type: 'engrxiv' }, () => O.some('en' as const))
              .with({ type: 'osf', text: P.select() }, detectLanguage)
              .with({ type: 'psyarxiv' }, () => O.some('en' as const))
              .with({ type: 'research-square' }, () => O.some('en' as const))
              .with({ type: 'scielo', text: P.select() }, detectLanguageFrom('en', 'es', 'pt'))
              .with({ type: 'socarxiv', text: P.select() }, detectLanguage)
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
              .with({ type: 'africarxiv', text: P.select() }, detectLanguageFrom('en', 'fr'))
              .with({ type: P.union('biorxiv', 'medrxiv') }, () => O.some('en' as const))
              .with({ type: 'eartharxiv' }, () => O.some('en' as const))
              .with({ type: 'edarxiv', text: P.select() }, detectLanguage)
              .with({ type: 'engrxiv' }, () => O.some('en' as const))
              .with({ type: 'osf', text: P.select() }, detectLanguage)
              .with({ type: 'psyarxiv' }, () => O.some('en' as const))
              .with({ type: 'research-square' }, () => O.some('en' as const))
              .with({ type: 'scielo', text: P.select() }, detectLanguageFrom('en', 'es', 'pt'))
              .with({ type: 'socarxiv', text: P.select() }, detectLanguage)
              .exhaustive(),
          ),
        ),
      ),
    ),
    E.let('url', () => toHttps(work.resource.primary.URL)),
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

const PreprintIdD: D.Decoder<Work, CrossrefPreprintId> = D.union(
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31730'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('AfricArXiv'),
    }),
    D.map(work => ({
      type: 'africarxiv' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('1101'), 'DOI'),
      publisher: D.literal('Cold Spring Harbor Laboratory'),
      institution: D.fromTuple(D.struct({ name: D.literal('bioRxiv') })),
    }),
    D.map(work => ({
      type: 'biorxiv' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31223'), 'DOI'),
      publisher: D.literal('California Digital Library (CDL)'),
    }),
    D.map(work => ({
      type: 'eartharxiv' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('35542'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('EdArXiv'),
    }),
    D.map(work => ({
      type: 'edarxiv' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31224'), 'DOI'),
      publisher: D.literal('Open Engineering Inc'),
    }),
    D.map(work => ({
      type: 'engrxiv' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('1101'), 'DOI'),
      publisher: D.literal('Cold Spring Harbor Laboratory'),
      institution: D.fromTuple(D.struct({ name: D.literal('medRxiv') })),
    }),
    D.map(work => ({
      type: 'medrxiv' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31219'), 'DOI'),
      publisher: D.literal('Center for Open Science', 'CABI Publishing'),
      'group-title': D.literal('Open Science Framework'),
    }),
    D.map(work => ({
      type: 'osf' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31234'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('PsyArXiv'),
    }),
    D.map(work => ({
      type: 'psyarxiv' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('21203'), 'DOI'),
      publisher: D.literal('Research Square Platform LLC'),
      institution: D.fromTuple(D.struct({ name: D.literal('Research Square') })),
    }),
    D.map(work => ({
      type: 'research-square' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('1590'), 'DOI'),
      publisher: D.literal('FapUNIFESP (SciELO)'),
    }),
    D.map(work => ({
      type: 'scielo' as const,
      doi: work.DOI,
    })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31235'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('SocArXiv'),
    }),
    D.map(work => ({
      type: 'socarxiv' as const,
      doi: work.DOI,
    })),
  ),
)
