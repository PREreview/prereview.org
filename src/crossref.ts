import { type Work, getWork } from 'crossref-ts'
import { type Doi, hasRegistrant } from 'doi-ts'
import { flow, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { isString } from 'fp-ts/lib/string.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import { P, isMatching, match } from 'ts-pattern'
import { detectLanguage, detectLanguageFrom } from './detect-language.js'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch.js'
import { type Html, sanitizeHtml } from './html.js'
import { transformJatsToHtml } from './jats.js'
import * as Preprint from './preprint.js'
import type {
  AdvancePreprintId,
  AfricarxivOsfPreprintId,
  AuthoreaPreprintId,
  BiorxivPreprintId,
  ChemrxivPreprintId,
  CurvenotePreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  IndeterminatePreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  OsfPreprintsPreprintId,
  PreprintId,
  PreprintsorgPreprintId,
  PsyarxivPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  ScienceOpenPreprintId,
  SocarxivPreprintId,
  TechrxivPreprintId,
  VerixivPreprintId,
} from './types/preprint-id.js'

const crossrefDoiPrefixes = [
  '1101',
  '1590',
  '12688',
  '14293',
  '20944',
  '21203',
  '22541',
  '26434',
  '31124',
  '31219',
  '31222',
  '31223',
  '31224',
  '31234',
  '31235',
  '31730',
  '32942',
  '35542',
  '36227',
  '62329',
] as const

type CrossrefDoiPrefix = (typeof crossrefDoiPrefixes)[number]

export type CrossrefPreprintId = Extract<PreprintId, { value: Doi<CrossrefDoiPrefix> }>

export type IndeterminateCrossrefPreprintId = Extract<IndeterminatePreprintId, { value: Doi<CrossrefDoiPrefix> }>

export const isCrossrefPreprintDoi = hasRegistrant(...crossrefDoiPrefixes)

export const getPreprintFromCrossref = flow(
  (id: IndeterminateCrossrefPreprintId) => getWork(id.value),
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainEitherKW(workToPreprint),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: Status.NotFound }, response => new Preprint.PreprintIsNotFound({ cause: response }))
      .with('not a preprint', () => new Preprint.NotAPreprint({}))
      .otherwise(error => new Preprint.PreprintIsUnavailable({ cause: error })),
  ),
)

function workToPreprint(work: Work): E.Either<D.DecodeError | string, Preprint.Preprint> {
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
          E.fromOptionK(() => 'unknown language' as const)(({ text }) => detectLanguageForServer({ type, text })),
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
            detectLanguageForServer({ type: preprint.id.type, text }),
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

const isAPreprint: (work: Work) => boolean = isMatching(
  P.union(
    { type: 'posted-content', subtype: 'preprint' },
    { description: 'Authorea status: Preprint', DOI: P.when(hasRegistrant('22541')), type: 'dataset' },
  ),
)

const findPublishedDate = (work: Work) =>
  pipe(
    O.fromNullable(work.published),
    O.getOrElse(() => work.created),
  )

const detectLanguageForServer = ({
  type,
  text,
}: {
  type: CrossrefPreprintId['type']
  text: Html
}): O.Option<LanguageCode> =>
  match({ type, text })
    .with({ type: 'advance' }, () => O.some('en' as const))
    .with({ type: 'africarxiv', text: P.select() }, detectLanguageFrom('en', 'fr'))
    .with({ type: 'authorea', text: P.select() }, detectLanguage)
    .with({ type: P.union('biorxiv', 'medrxiv') }, () => O.some('en' as const))
    .with({ type: 'chemrxiv' }, () => O.some('en' as const))
    .with({ type: 'curvenote' }, () => O.some('en' as const))
    .with({ type: 'eartharxiv' }, () => O.some('en' as const))
    .with({ type: 'ecoevorxiv' }, () => O.some('en' as const))
    .with({ type: 'edarxiv', text: P.select() }, detectLanguage)
    .with({ type: 'engrxiv' }, () => O.some('en' as const))
    .with({ type: 'metaarxiv' }, () => O.some('en' as const))
    .with({ type: 'osf-preprints', text: P.select() }, detectLanguage)
    .with({ type: 'preprints.org' }, () => O.some('en' as const))
    .with({ type: 'psyarxiv' }, () => O.some('en' as const))
    .with({ type: 'research-square' }, () => O.some('en' as const))
    .with({ type: 'scielo', text: P.select() }, detectLanguageFrom('en', 'es', 'pt'))
    .with({ type: 'science-open', text: P.select() }, detectLanguage)
    .with({ type: 'socarxiv', text: P.select() }, detectLanguage)
    .with({ type: 'techrxiv' }, () => O.some('en' as const))
    .with({ type: 'verixiv' }, () => O.some('en' as const))
    .exhaustive()

const PreprintIdD: D.Decoder<Work, CrossrefPreprintId> = D.union(
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31124'), 'DOI'),
      institution: D.fromTuple(D.struct({ name: D.literal('Advance') })),
    }),
    D.map(
      work =>
        ({
          type: 'advance',
          value: work.DOI,
        }) satisfies AdvancePreprintId,
    ),
  ),
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
      DOI: D.fromRefinement(hasRegistrant('62329'), 'DOI'),
      publisher: D.literal('Curvenote Inc.'),
    }),
    D.map(
      work =>
        ({
          type: 'curvenote',
          value: work.DOI,
        }) satisfies CurvenotePreprintId,
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
          type: 'osf-preprints',
          value: work.DOI,
        }) satisfies OsfPreprintsPreprintId,
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
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('36227'), 'DOI'),
      publisher: D.literal('Institute of Electrical and Electronics Engineers (IEEE)'),
    }),
    D.map(work => ({ type: 'techrxiv', value: work.DOI }) satisfies TechrxivPreprintId),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('12688'), 'DOI'),
      'group-title': D.literal('Gates Foundation'),
    }),
    D.map(work => ({ type: 'verixiv', value: work.DOI }) satisfies VerixivPreprintId),
  ),
)
