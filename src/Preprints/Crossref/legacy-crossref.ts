import { type Work, getWork } from 'crossref-ts'
import { type Doi, hasRegistrant } from 'doi-ts'
import { Array, Option, String, flow, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import { P, isMatching, match } from 'ts-pattern'
import { detectLanguage, detectLanguageFrom } from '../../detect-language.js'
import { timeoutRequest, useStaleCache } from '../../fetch.js'
import { type Html, sanitizeHtml } from '../../html.js'
import { transformJatsToHtml } from '../../jats.js'
import * as StatusCodes from '../../StatusCodes.js'
import * as Preprint from '../Preprint.js'
import {
  AdvancePreprintId,
  AfricarxivOsfPreprintId,
  AuthoreaPreprintId,
  ChemrxivPreprintId,
  CurvenotePreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  type IndeterminatePreprintId,
  type PreprintId,
  PsyarxivPreprintId,
  ScienceOpenPreprintId,
  TechrxivPreprintId,
} from '../PreprintId.js'

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
      .with({ status: StatusCodes.NotFound }, response => new Preprint.PreprintIsNotFound({ cause: response }))
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
    .with({ type: 'AdvancePreprintId' }, () => Option.some('en' as const))
    .with({ type: 'AfricarxivOsfPreprintId', text: P.select() }, detectLanguageFrom('en', 'fr'))
    .with({ type: 'AuthoreaPreprintId', text: P.select() }, detectLanguage)
    .with({ type: 'ChemrxivPreprintId' }, () => Option.some('en' as const))
    .with({ type: 'CurvenotePreprintId' }, () => Option.some('en' as const))
    .with({ type: 'EartharxivPreprintId' }, () => Option.some('en' as const))
    .with({ type: 'EcoevorxivPreprintId' }, () => Option.some('en' as const))
    .with({ type: 'EdarxivPreprintId', text: P.select() }, detectLanguage)
    .with({ type: 'EngrxivPreprintId' }, () => Option.some('en' as const))
    .with({ type: 'PsyarxivPreprintId' }, () => Option.some('en' as const))
    .with({ type: 'ScienceOpenPreprintId', text: P.select() }, detectLanguage)
    .with({ type: 'TechrxivPreprintId' }, () => Option.some('en' as const))
    .exhaustive()

const PreprintIdD: D.Decoder<Work, CrossrefPreprintId> = D.union(
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31124'), 'DOI'),
      institution: D.fromTuple(D.struct({ name: D.literal('Advance') })),
    }),
    D.map(work => new AdvancePreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31730'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('AfricArXiv'),
    }),
    D.map(work => new AfricarxivOsfPreprintId({ value: work.DOI })),
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
    D.map(work => new AuthoreaPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('26434'), 'DOI'),
      publisher: D.literal('American Chemical Society (ACS)'),
    }),
    D.map(work => new ChemrxivPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('62329'), 'DOI'),
      publisher: D.literal('Curvenote Inc.'),
    }),
    D.map(work => new CurvenotePreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31223'), 'DOI'),
      publisher: D.literal('California Digital Library (CDL)'),
    }),
    D.map(work => new EartharxivPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('32942'), 'DOI'),
      publisher: D.literal('California Digital Library (CDL)'),
    }),
    D.map(work => new EcoevorxivPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('35542'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('EdArXiv'),
    }),
    D.map(work => new EdarxivPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31224'), 'DOI'),
      publisher: D.literal('Open Engineering Inc'),
    }),
    D.map(work => new EngrxivPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('31234'), 'DOI'),
      publisher: D.literal('Center for Open Science'),
      'group-title': D.literal('PsyArXiv'),
    }),
    D.map(work => new PsyarxivPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('14293'), 'DOI'),
      publisher: D.literal('ScienceOpen'),
    }),
    D.map(work => new ScienceOpenPreprintId({ value: work.DOI })),
  ),
  pipe(
    D.fromStruct({
      DOI: D.fromRefinement(hasRegistrant('36227'), 'DOI'),
      publisher: D.literal('Institute of Electrical and Electronics Engineers (IEEE)'),
    }),
    D.map(work => new TechrxivPreprintId({ value: work.DOI })),
  ),
)
