import { type Work, getWork } from 'crossref-ts'
import { type Doi, hasRegistrant } from 'doi-ts'
import { Array, Option, String, flow, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import { P, isMatching, match } from 'ts-pattern'
import { detectLanguage, detectLanguageFrom } from './detect-language.js'
import { timeoutRequest, useStaleCache } from './fetch.js'
import { type Html, sanitizeHtml } from './html.js'
import { transformJatsToHtml } from './jats.js'
import * as Preprint from './preprint.js'
import type {
  AdvancePreprintId,
  AfricarxivOsfPreprintId,
  AuthoreaPreprintId,
  ChemrxivPreprintId,
  CurvenotePreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  IndeterminatePreprintId,
  PreprintId,
  PsyarxivPreprintId,
  ScienceOpenPreprintId,
  TechrxivPreprintId,
} from './types/preprint-id.js'

const crossrefDoiPrefixes = [
  '14293',
  '22541',
  '26434',
  '31124',
  '31223',
  '31224',
  '31234',
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
        Array.map(author =>
          match(author)
            .with({ name: P.string }, author => ({
              name: author.name,
            }))
            .with({ family: P.string }, author => ({
              name: [author.prefix, author.given, author.family, author.suffix].filter(String.isString).join(' '),
              orcid: author.ORCID,
            }))
            .exhaustive(),
        ),
        E.fromPredicate(
          authors => Array.isNonEmptyReadonlyArray(authors),
          () => 'no authors',
        ),
      ),
    ),
    E.apSW('id', PreprintIdD.decode(work)),
    E.let('posted', () => findPublishedDate(work)),
    E.bindW('abstract', ({ id: { _tag: type } }) =>
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
        E.fromOptionK(() => 'no title')(Array.head),
        E.map(sanitizeHtml),
        E.bindTo('text'),
        E.bind(
          'language',
          E.fromOptionK(() => 'unknown language')(({ text }) =>
            detectLanguageForServer({ type: preprint.id._tag, text }),
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
    Option.fromNullable(work.published),
    Option.getOrElse(() => work.created),
  )

const detectLanguageForServer = ({
  type,
  text,
}: {
  type: CrossrefPreprintId['_tag']
  text: Html
}): Option.Option<LanguageCode> =>
  match({ type, text })
    .with({ type: 'advance' }, () => Option.some('en' as const))
    .with({ type: 'africarxiv', text: P.select() }, detectLanguageFrom('en', 'fr'))
    .with({ type: 'authorea', text: P.select() }, detectLanguage)
    .with({ type: 'chemrxiv' }, () => Option.some('en' as const))
    .with({ type: 'curvenote' }, () => Option.some('en' as const))
    .with({ type: 'eartharxiv' }, () => Option.some('en' as const))
    .with({ type: 'ecoevorxiv' }, () => Option.some('en' as const))
    .with({ type: 'edarxiv', text: P.select() }, detectLanguage)
    .with({ type: 'engrxiv' }, () => Option.some('en' as const))
    .with({ type: 'psyarxiv' }, () => Option.some('en' as const))
    .with({ type: 'science-open', text: P.select() }, detectLanguage)
    .with({ type: 'techrxiv' }, () => Option.some('en' as const))
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
          _tag: 'advance',
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
          _tag: 'africarxiv',
          value: work.DOI,
        }) satisfies AfricarxivOsfPreprintId,
    ),
  ),
  pipe(
    D.union(
      D.fromStruct({
        DOI: D.fromRefinement(hasRegistrant('22541'), 'DOI'),
        publisher: D.literal('Authorea, Inc.'),
      }),
      D.fromStruct({
        DOI: D.fromRefinement(hasRegistrant('22541'), 'DOI'),
        institution: D.fromTuple(D.struct({ name: D.literal('Authorea, Inc.') })),
      }),
    ),
    D.map(work => ({ _tag: 'authorea', value: work.DOI }) satisfies AuthoreaPreprintId),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('26434'), 'DOI'),
      publisher: D.literal('American Chemical Society (ACS)'),
    }),
    D.map(
      work =>
        ({
          _tag: 'chemrxiv',
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
          _tag: 'curvenote',
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
          _tag: 'eartharxiv',
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
          _tag: 'ecoevorxiv',
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
          _tag: 'edarxiv',
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
          _tag: 'engrxiv',
          value: work.DOI,
        }) satisfies EngrxivPreprintId,
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
          _tag: 'psyarxiv',
          value: work.DOI,
        }) satisfies PsyarxivPreprintId,
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
          _tag: 'science-open',
          value: work.DOI,
        }) satisfies ScienceOpenPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('36227'), 'DOI'),
      publisher: D.literal('Institute of Electrical and Electronics Engineers (IEEE)'),
    }),
    D.map(work => ({ _tag: 'techrxiv', value: work.DOI }) satisfies TechrxivPreprintId),
  ),
)
