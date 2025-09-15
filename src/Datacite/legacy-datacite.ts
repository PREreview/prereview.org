import type { Temporal } from '@js-temporal/polyfill'
import { type Work, getWork } from 'datacite-ts'
import { type Doi, hasRegistrant } from 'doi-ts'
import { Array, Option, flow, identity, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { LanguageCode } from 'iso-639-1'
import { P, match } from 'ts-pattern'
import * as StatusCodes from '../StatusCodes.js'
import { detectLanguageFrom } from '../detect-language.js'
import { timeoutRequest, useStaleCache } from '../fetch.js'
import { sanitizeHtml } from '../html.js'
import * as Preprint from '../preprint.js'
import { Orcid } from '../types/index.js'
import {
  AfricarxivFigsharePreprintId,
  AfricarxivUbuntunetPreprintId,
  ArcadiaSciencePreprintId,
  type IndeterminatePreprintId,
  type PreprintId,
  PsychArchivesPreprintId,
} from '../types/preprint-id.js'

const dataciteDoiPrefixes = ['6084', '23668', '57844', '60763'] as const

type DataciteDoiPrefix = (typeof dataciteDoiPrefixes)[number]

export type DatacitePreprintId = Extract<PreprintId, { value: Doi<DataciteDoiPrefix> }>

export type IndeterminateDatacitePreprintId = Extract<IndeterminatePreprintId, { value: Doi<DataciteDoiPrefix> }>

export const isDatacitePreprintDoi = hasRegistrant(...dataciteDoiPrefixes)

export const getPreprintFromDatacite = flow(
  (id: IndeterminateDatacitePreprintId) => getWork(id.value),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.chainEitherKW(dataciteWorkToPreprint),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: StatusCodes.NotFound }, response => new Preprint.PreprintIsNotFound({ cause: response }))
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
        (work.types.resourceTypeGeneral?.toLowerCase() === 'text' && hasRegistrant('60763')(work.doi)) ||
        (work.types.resourceTypeGeneral === undefined && hasRegistrant('23668', '60763')(work.doi)) ||
        hasRegistrant('57844')(work.doi),
      () => 'not a preprint',
    ),
    E.apSW(
      'authors',
      pipe(
        work.creators,
        Array.map(author =>
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
        E.fromPredicate(
          authors => Array.isNonEmptyReadonlyArray(authors),
          () => 'no authors',
        ),
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
    E.bindW('abstract', ({ id: { _tag: type } }) =>
      pipe(
        work.descriptions,
        E.fromOptionK(() => 'no abstract' as const)(
          Array.findFirst(({ descriptionType }) => descriptionType === 'Abstract'),
        ),
        E.map(({ description }) => sanitizeHtml(`<p>${description}</p>`)),
        E.bindTo('text'),
        E.bindW(
          'language',
          E.fromOptionK(() => 'unknown language' as const)(({ text }) =>
            match({ type, text })
              .returnType<Option.Option<LanguageCode>>()
              .with(
                { type: P.union('AfricarxivFigsharePreprintId', 'AfricarxivUbuntunetPreprintId'), text: P.select() },
                detectLanguageFrom('en', 'fr'),
              )
              .with({ type: 'ArcadiaSciencePreprintId' }, () => Option.some('en' as const))
              .with({ type: 'PsychArchivesPreprintId', text: P.select() }, detectLanguageFrom('de', 'en'))
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
    E.bindW('title', ({ id: { _tag: type } }) =>
      pipe(
        E.right(work.titles[0].title),
        E.map(sanitizeHtml),
        E.bindTo('text'),
        E.bind(
          'language',
          E.fromOptionK(() => 'unknown language')(({ text }) =>
            match({ type, text })
              .returnType<Option.Option<LanguageCode>>()
              .with(
                { type: P.union('AfricarxivFigsharePreprintId', 'AfricarxivUbuntunetPreprintId'), text: P.select() },
                detectLanguageFrom('en', 'fr'),
              )
              .with({ type: 'ArcadiaSciencePreprintId' }, () => Option.some('en' as const))
              .with({ type: 'PsychArchivesPreprintId', text: P.select() }, detectLanguageFrom('de', 'en'))
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
  Array.findFirst(({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID'),
  Option.flatMap(({ nameIdentifier }) => Orcid.parse(nameIdentifier)),
  Option.getOrUndefined,
)

const findPublishedDate = (dates: Work['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Submitted')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Created')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Issued')),
  )

const PreprintIdD: D.Decoder<Work, DatacitePreprintId> = D.union(
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('60763'), 'DOI'),
    }),
    D.map(work => new AfricarxivUbuntunetPreprintId({ value: work.doi })),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('6084'), 'DOI'),
      publisher: D.literal('AfricArXiv'),
    }),
    D.map(work => new AfricarxivFigsharePreprintId({ value: work.doi })),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('57844'), 'DOI'),
      publisher: D.literal('Arcadia Science'),
    }),
    D.map(work => new ArcadiaSciencePreprintId({ value: work.doi })),
  ),
  pipe(
    D.fromStruct({
      doi: D.fromRefinement(hasRegistrant('23668'), 'DOI'),
      publisher: D.literal('PsychArchives', 'Leibniz Institut für Psychologie (ZPID)'),
    }),
    D.map(work => new PsychArchivesPreprintId({ value: work.doi })),
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
