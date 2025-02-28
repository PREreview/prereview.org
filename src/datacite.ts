import type { Temporal } from '@js-temporal/polyfill'
import { type Work, getWork } from 'datacite-ts'
import { type Doi, hasRegistrant } from 'doi-ts'
import { Option, flow, identity, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import { parse } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { detectLanguage, detectLanguageFrom } from './detect-language.js'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch.js'
import * as FptsToEffect from './FptsToEffect.js'
import { sanitizeHtml } from './html.js'
import * as Preprint from './preprint.js'
import type {
  AfricarxivFigsharePreprintId,
  AfricarxivUbuntunetPreprintId,
  AfricarxivZenodoPreprintId,
  ArcadiaSciencePreprintId,
  ArxivPreprintId,
  IndeterminatePreprintId,
  OsfPreprintId,
  PreprintId,
  PsychArchivesPreprintId,
  ZenodoPreprintId,
} from './types/preprint-id.js'

const dataciteDoiPrefixes = ['5281', '6084', '17605', '23668', '48550', '57844', '60763'] as const

type DataciteDoiPrefix = (typeof dataciteDoiPrefixes)[number]

export type DatacitePreprintId = Extract<PreprintId, { value: Doi<DataciteDoiPrefix> }>

export type IndeterminateDatacitePreprintId = Extract<IndeterminatePreprintId, { value: Doi<DataciteDoiPrefix> }>

export const isDatacitePreprintDoi = hasRegistrant(...dataciteDoiPrefixes)

export const getPreprintFromDatacite = flow(
  (id: IndeterminateDatacitePreprintId) => getWork(id.value),
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainEitherKW(dataciteWorkToPreprint),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: Status.NotFound }, response => new Preprint.PreprintIsNotFound({ cause: response }))
      .with('not a preprint', () => new Preprint.NotAPreprint({}))
      .otherwise(error => new Preprint.PreprintIsUnavailable({ cause: error })),
  ),
)

function dataciteWorkToPreprint(work: Work): E.Either<D.DecodeError | string, Preprint.Preprint> {
  return pipe(
    E.Do,
    E.filterOrElse(
      () =>
        work.types.resourceType?.toLowerCase() === 'preprint' ||
        work.types.resourceTypeGeneral?.toLowerCase() === 'preprint' ||
        (work.types.resourceTypeGeneral?.toLowerCase() === 'text' && hasRegistrant('48550', '60763')(work.doi)) ||
        (work.types.resourceTypeGeneral === undefined && hasRegistrant('23668', '60763')(work.doi)) ||
        hasRegistrant('57844')(work.doi),
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
              orcid: findOrcid(author),
            }))
            .with({ familyName: P.string }, author => ({
              name: author.familyName,
              orcid: findOrcid(author),
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
        E.fromOptionK(() => 'no published date' as const)(findPublishedDate),
        E.map(({ date }) =>
          match(date)
            .when(isInstant, instant => instant.toZonedDateTimeISO('UTC').toPlainDate())
            .with(P.union(P.when(isPlainDate), P.when(isPlainYearMonth), P.number), identity)
            .exhaustive(),
        ),
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
              .returnType<Option.Option<LanguageCode>>()
              .with({ type: 'africarxiv', text: P.select() }, detectLanguageFrom('en', 'fr'))
              .with({ type: 'arcadia-science' }, () => Option.some('en' as const))
              .with({ type: 'arxiv' }, () => Option.some('en' as const))
              .with({ type: 'osf', text: P.select() }, detectLanguage)
              .with({ type: 'psycharchives', text: P.select() }, detectLanguageFrom('de', 'en'))
              .with({ type: 'zenodo', text: P.select() }, detectLanguage)
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
              .returnType<Option.Option<LanguageCode>>()
              .with({ type: 'africarxiv', text: P.select() }, detectLanguageFrom('en', 'fr'))
              .with({ type: 'arcadia-science' }, () => Option.some('en' as const))
              .with({ type: 'arxiv' }, () => Option.some('en' as const))
              .with({ type: 'osf', text: P.select() }, detectLanguage)
              .with({ type: 'psycharchives', text: P.select() }, detectLanguageFrom('de', 'en'))
              .with({ type: 'zenodo', text: P.select() }, detectLanguage)
              .exhaustive(),
          ),
        ),
      ),
    ),
    E.let('url', () => work.url),
  )
}

const findOrcid = flow(
  (person: Extract<Work['creators'][number], { nameIdentifiers: ReadonlyArray<unknown> }>) => person.nameIdentifiers,
  FptsToEffect.optionK(RA.findFirst(({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID')),
  Option.flatMap(({ nameIdentifier }) => FptsToEffect.option(parse(nameIdentifier))),
  Option.getOrUndefined,
)

const findPublishedDate = (dates: Work['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => pipe(dates, FptsToEffect.optionK(RA.findFirst(({ dateType }) => dateType === 'Submitted')))),
    Option.orElse(() => pipe(dates, FptsToEffect.optionK(RA.findFirst(({ dateType }) => dateType === 'Created')))),
    Option.orElse(() => pipe(dates, FptsToEffect.optionK(RA.findFirst(({ dateType }) => dateType === 'Issued')))),
  )

const PreprintIdD: D.Decoder<Work, DatacitePreprintId> = D.union(
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('60763'), 'DOI'),
    }),
    D.map(
      work =>
        ({
          type: 'africarxiv',
          value: work.doi,
        }) satisfies AfricarxivUbuntunetPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('6084'), 'DOI'),
      publisher: D.literal('AfricArXiv'),
    }),
    D.map(
      work =>
        ({
          type: 'africarxiv',
          value: work.doi,
        }) satisfies AfricarxivFigsharePreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('5281'), 'DOI'),
      publisher: D.literal('Zenodo'),
      relatedIdentifiers: pipe(
        D.array(
          D.struct({
            relationType: D.string,
            relatedIdentifier: D.string,
          }),
        ),
        D.parse(
          E.fromOptionK(() => D.error(undefined, 'AfricArXiv Community'))(
            RA.findFirst(
              ({ relationType, relatedIdentifier }) =>
                relationType === 'IsPartOf' && relatedIdentifier === 'https://zenodo.org/communities/africarxiv',
            ),
          ),
        ),
      ),
    }),
    D.map(
      work =>
        ({
          type: 'africarxiv',
          value: work.doi,
        }) satisfies AfricarxivZenodoPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('57844'), 'DOI'),
      publisher: D.literal('Arcadia Science'),
    }),
    D.map(
      work =>
        ({
          type: 'arcadia-science',
          value: work.doi,
        }) satisfies ArcadiaSciencePreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('48550'), 'DOI'),
      publisher: D.literal('arXiv'),
    }),
    D.map(
      work =>
        ({
          type: 'arxiv',
          value: work.doi,
        }) satisfies ArxivPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('17605'), 'DOI'),
      publisher: D.literal('OSF'),
    }),
    D.map(
      work =>
        ({
          type: 'osf',
          value: work.doi,
        }) satisfies OsfPreprintId,
    ),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('23668'), 'DOI'),
      publisher: D.literal('PsychArchives', 'Leibniz Institut für Psychologie (ZPID)'),
    }),
    D.map(work => ({ type: 'psycharchives', value: work.doi }) satisfies PsychArchivesPreprintId),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('5281'), 'DOI'),
    }),
    D.map(
      work =>
        ({
          type: 'zenodo',
          value: work.doi,
        }) satisfies ZenodoPreprintId,
    ),
  ),
)

function isInstant(value: unknown): value is Temporal.Instant {
  return typeof value === 'object' && value?.constructor.name === 'Instant'
}

function isPlainDate(value: unknown): value is Temporal.PlainDate {
  return typeof value === 'object' && value?.constructor.name === 'PlainDate'
}

function isPlainYearMonth(value: unknown): value is Temporal.PlainYearMonth {
  return typeof value === 'object' && value?.constructor.name === 'PlainYearMonth'
}
