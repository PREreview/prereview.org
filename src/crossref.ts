import { type Work, getWork } from 'crossref-ts'
import { type Doi, hasRegistrant } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import type { Refinement } from 'fp-ts/Refinement'
import { flow, pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { P, isMatching, match } from 'ts-pattern'
import { detectLanguage, detectLanguageFrom } from './detect-language'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { sanitizeHtml } from './html'
import { transformJatsToHtml } from './jats'
import type { Preprint } from './preprint'
import type {
  AfricarxivOsfPreprintId,
  AuthoreaPreprintId,
  BiorxivPreprintId,
  ChemrxivPreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  OsfPreprintId,
  PreprintsorgPreprintId,
  PsyarxivPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  ScienceOpenPreprintId,
  SocarxivPreprintId,
} from './preprint-id'

export type CrossrefPreprintId =
  | AfricarxivOsfPreprintId
  | AuthoreaPreprintId
  | BiorxivPreprintId
  | ChemrxivPreprintId
  | EartharxivPreprintId
  | EcoevorxivPreprintId
  | EdarxivPreprintId
  | EngrxivPreprintId
  | MedrxivPreprintId
  | MetaarxivPreprintId
  | OsfPreprintId
  | PreprintsorgPreprintId
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | ScienceOpenPreprintId
  | SocarxivPreprintId

export const isCrossrefPreprintDoi: Refinement<Doi, CrossrefPreprintId['value']> = hasRegistrant(
  '1101',
  '1590',
  '14293',
  '20944',
  '21203',
  '22541',
  '26434',
  '31219',
  '31222',
  '31223',
  '31224',
  '31234',
  '31235',
  '31730',
  '32942',
  '35542',
)

export const getPreprintFromCrossref = flow(
  (id: CrossrefPreprintId) => getWork(id.value),
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainEitherKW(workToPreprint),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: Status.NotFound }, () => 'not-found' as const)
      .with('not a preprint', () => 'not-a-preprint' as const)
      .otherwise(() => 'unavailable' as const),
  ),
)

function workToPreprint(work: Work): E.Either<D.DecodeError | string, Preprint> {
  return pipe(
    E.Do,
    E.filterOrElse(
      () => isAPreprint(work),
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
    E.let('posted', () => findPublishedDate(work)),
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
              .with({ type: 'authorea', text: P.select() }, detectLanguage)
              .with({ type: P.union('biorxiv', 'medrxiv') }, () => O.some('en' as const))
              .with({ type: 'chemrxiv' }, () => O.some('en' as const))
              .with({ type: 'eartharxiv' }, () => O.some('en' as const))
              .with({ type: 'ecoevorxiv' }, () => O.some('en' as const))
              .with({ type: 'edarxiv', text: P.select() }, detectLanguage)
              .with({ type: 'engrxiv' }, () => O.some('en' as const))
              .with({ type: 'metaarxiv' }, () => O.some('en' as const))
              .with({ type: 'osf', text: P.select() }, detectLanguage)
              .with({ type: 'preprints.org' }, () => O.some('en' as const))
              .with({ type: 'psyarxiv' }, () => O.some('en' as const))
              .with({ type: 'research-square' }, () => O.some('en' as const))
              .with({ type: 'scielo', text: P.select() }, detectLanguageFrom('en', 'es', 'pt'))
              .with({ type: 'science-open', text: P.select() }, detectLanguage)
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
              .with({ type: 'authorea', text: P.select() }, detectLanguage)
              .with({ type: P.union('biorxiv', 'medrxiv') }, () => O.some('en' as const))
              .with({ type: 'chemrxiv' }, () => O.some('en' as const))
              .with({ type: 'eartharxiv' }, () => O.some('en' as const))
              .with({ type: 'ecoevorxiv' }, () => O.some('en' as const))
              .with({ type: 'edarxiv', text: P.select() }, detectLanguage)
              .with({ type: 'engrxiv' }, () => O.some('en' as const))
              .with({ type: 'metaarxiv' }, () => O.some('en' as const))
              .with({ type: 'osf', text: P.select() }, detectLanguage)
              .with({ type: 'preprints.org' }, () => O.some('en' as const))
              .with({ type: 'psyarxiv' }, () => O.some('en' as const))
              .with({ type: 'research-square' }, () => O.some('en' as const))
              .with({ type: 'scielo', text: P.select() }, detectLanguageFrom('en', 'es', 'pt'))
              .with({ type: 'science-open', text: P.select() }, detectLanguage)
              .with({ type: 'socarxiv', text: P.select() }, detectLanguage)
              .exhaustive(),
          ),
        ),
      ),
    ),
    E.let('url', () => toHttps(work.resource.primary.URL)),
  )
}

function toHttps(url: URL): URL {
  const httpsUrl = new URL(url)
  httpsUrl.protocol = 'https'

  return httpsUrl
}

const isAPreprint: (work: Work) => boolean = isMatching({ type: 'posted-content', subtype: 'preprint' })

const findPublishedDate = (work: Work) =>
  pipe(
    O.fromNullable(work.published),
    O.getOrElse(() => work.created),
  )

const PreprintIdD: D.Decoder<Work, CrossrefPreprintId> = D.union(
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31730'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('AfricArXiv'),
    }),
    D.map(
      work =>
        ({
          type: 'africarxiv',
          value: work.DOI,
        }) satisfies AfricarxivOsfPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('22541'), 'DOI'),
      publisher: D.literal('Authorea, Inc.'),
    }),
    D.map(work => ({ type: 'authorea', value: work.DOI }) satisfies AuthoreaPreprintId),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('1101'), 'DOI'),
      publisher: D.literal('Cold Spring Harbor Laboratory'),
      institution: D.fromTuple(D.struct({ name: D.literal('bioRxiv') })),
    }),
    D.map(
      work =>
        ({
          type: 'biorxiv',
          value: work.DOI,
        }) satisfies BiorxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('26434'), 'DOI'),
      publisher: D.literal('American Chemical Society (ACS)'),
    }),
    D.map(
      work =>
        ({
          type: 'chemrxiv',
          value: work.DOI,
        }) satisfies ChemrxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31223'), 'DOI'),
      publisher: D.literal('California Digital Library (CDL)'),
    }),
    D.map(
      work =>
        ({
          type: 'eartharxiv',
          value: work.DOI,
        }) satisfies EartharxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('32942'), 'DOI'),
      publisher: D.literal('California Digital Library (CDL)'),
    }),
    D.map(
      work =>
        ({
          type: 'ecoevorxiv',
          value: work.DOI,
        }) satisfies EcoevorxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('35542'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('EdArXiv'),
    }),
    D.map(
      work =>
        ({
          type: 'edarxiv',
          value: work.DOI,
        }) satisfies EdarxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31224'), 'DOI'),
      publisher: D.literal('Open Engineering Inc'),
    }),
    D.map(
      work =>
        ({
          type: 'engrxiv',
          value: work.DOI,
        }) satisfies EngrxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('1101'), 'DOI'),
      publisher: D.literal('Cold Spring Harbor Laboratory'),
      institution: D.fromTuple(D.struct({ name: D.literal('medRxiv') })),
    }),
    D.map(
      work =>
        ({
          type: 'medrxiv',
          value: work.DOI,
        }) satisfies MedrxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31222'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('MetaArXiv'),
    }),
    D.map(
      work =>
        ({
          type: 'metaarxiv',
          value: work.DOI,
        }) satisfies MetaarxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31219'), 'DOI'),
      publisher: D.literal('Center for Open Science', 'CABI Publishing'),
      'group-title': D.literal('Open Science Framework'),
    }),
    D.map(
      work =>
        ({
          type: 'osf',
          value: work.DOI,
        }) satisfies OsfPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('20944'), 'DOI'),
      publisher: D.literal('MDPI AG'),
    }),
    D.map(
      work =>
        ({
          type: 'preprints.org',
          value: work.DOI,
        }) satisfies PreprintsorgPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31234'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('PsyArXiv'),
    }),
    D.map(
      work =>
        ({
          type: 'psyarxiv',
          value: work.DOI,
        }) satisfies PsyarxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('21203'), 'DOI'),
      publisher: D.literal('Research Square Platform LLC'),
      institution: D.fromTuple(D.struct({ name: D.literal('Research Square') })),
    }),
    D.map(
      work =>
        ({
          type: 'research-square',
          value: work.DOI,
        }) satisfies ResearchSquarePreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('1590'), 'DOI'),
      publisher: D.literal('FapUNIFESP (SciELO)'),
    }),
    D.map(
      work =>
        ({
          type: 'scielo',
          value: work.DOI,
        }) satisfies ScieloPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('14293'), 'DOI'),
      publisher: D.literal('ScienceOpen'),
    }),
    D.map(
      work =>
        ({
          type: 'science-open',
          value: work.DOI,
        }) satisfies ScienceOpenPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31235'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('SocArXiv'),
    }),
    D.map(
      work =>
        ({
          type: 'socarxiv',
          value: work.DOI,
        }) satisfies SocarxivPreprintId,
    ),
  ),
)
