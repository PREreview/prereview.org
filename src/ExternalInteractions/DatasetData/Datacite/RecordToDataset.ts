import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Effect, Either, flow, Match, Option, pipe, Struct } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Datasets from '../../../Datasets/index.ts'
import type { Datacite } from '../../../ExternalApis/index.ts'
import { sanitizeHtml, type Html } from '../../../html.ts'
import { Iso639, OrcidId } from '../../../types/index.ts'
import * as LanguageDetection from '../../LanguageDetection/index.ts'
import { IsDoiFromSupportedPublisher, type DataciteDatasetId } from './DatasetId.ts'

export class RecordIsNotSupported extends Data.TaggedError('RecordIsNotSupported')<{
  cause?: unknown
}> {}

export const RecordToDataset = (
  record: Datacite.Record,
): Effect.Effect<
  Datasets.Dataset,
  Datasets.NotADataset | Datasets.DatasetIsUnavailable | RecordIsNotSupported,
  LanguageDetection.LanguageDetection
> =>
  Effect.gen(function* () {
    const datasetId = yield* determineDataciteDatasetId(record)

    if (
      record.types.resourceType?.toLowerCase() !== 'dataset' &&
      record.types.resourceTypeGeneral?.toLowerCase() !== 'dataset'
    ) {
      return yield* Either.left(new Datasets.NotADataset({ cause: record.types, datasetId }))
    }

    const recordLanguage = Iso639.isIso6391(record.language) ? record.language : undefined

    const authors = yield* Array.match(record.creators, {
      onEmpty: () =>
        Either.left(new Datasets.DatasetIsUnavailable({ cause: { creators: record.creators }, datasetId })),
      onNonEmpty: creators =>
        Either.right(
          Array.map(
            creators,
            flow(
              Match.value,
              Match.when({ name: Match.string }, creator => ({ name: creator.name, orcid: findOrcid(creator) })),
              Match.when({ givenName: Match.string, familyName: Match.string }, creator => ({
                name: `${creator.givenName} ${creator.familyName}`,
                orcid: findOrcid(creator),
              })),
              Match.exhaustive,
            ),
          ),
        ),
    })

    const title = yield* getTitle(record.titles, datasetId, recordLanguage)

    const abstract = yield* getAbstract(record.descriptions, datasetId, recordLanguage)

    const posted = yield* Either.fromOption(
      findPublishedDate(record.dates),
      () => new Datasets.DatasetIsUnavailable({ cause: { dates: record.dates }, datasetId }),
    )

    return new Datasets.Dataset({
      abstract,
      authors,
      id: datasetId,
      posted,
      title,
      url: record.url,
    })
  })

const determineDataciteDatasetId = (
  record: Datacite.Record,
): Either.Either<DataciteDatasetId, Datasets.DatasetIsUnavailable | RecordIsNotSupported> =>
  Either.gen(function* () {
    const doi = record.doi

    if (!IsDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new RecordIsNotSupported({ cause: doi }))
    }

    const datasetId = Datasets.fromDatasetDoi(doi)

    if (datasetId._tag === 'DryadDatasetId' && record.relationships.provider.toLowerCase() !== 'dryad') {
      return yield* Either.left(new RecordIsNotSupported({ cause: Struct.pick(record.relationships, 'provider') }))
    }

    return datasetId
  })

const findPublishedDate = (dates: Datacite.Record['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Available')),
    Option.andThen(Struct.get('date')),
    Option.andThen(date => (date instanceof Temporal.Instant ? date.toZonedDateTimeISO('UTC').toPlainDate() : date)),
    Option.filter(
      date => date instanceof Temporal.PlainDate || date instanceof Temporal.PlainYearMonth || typeof date === 'number',
    ),
  )

const findOrcid = (creator: Datacite.Record['creators'][number]) =>
  pipe(
    Array.findFirst(creator.nameIdentifiers, ({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID'),
    Option.andThen(({ nameIdentifier }) => OrcidId.parse(nameIdentifier)),
    Option.getOrUndefined,
  )

const getTitle = Effect.fnUntraced(function* (
  titles: Datacite.Record['titles'],
  id: DataciteDatasetId,
  recordLanguage?: LanguageCode,
): Effect.fn.Return<Datasets.Dataset['title'], Datasets.DatasetIsUnavailable, LanguageDetection.LanguageDetection> {
  const text = sanitizeHtml(titles[0].title, { allowBlockLevel: false })

  const language = yield* Effect.catchTag(
    detectLanguageForRepository({ id, text, recordLanguage }),
    'UnableToDetectLanguage',
    error => new Datasets.DatasetIsUnavailable({ cause: error, datasetId: id }),
  )

  return {
    language,
    text,
  }
})

const getAbstract = Effect.fnUntraced(function* (
  descriptions: Datacite.Record['descriptions'],
  id: DataciteDatasetId,
  recordLanguage?: LanguageCode,
): Effect.fn.Return<Datasets.Dataset['abstract'], never, LanguageDetection.LanguageDetection> {
  const abstract = Option.getOrUndefined(
    Array.findFirst(descriptions, ({ descriptionType }) => descriptionType === 'Abstract'),
  )

  if (!abstract) {
    return undefined
  }

  const text = sanitizeHtml(`<p>${abstract.description}</p>`)

  return yield* Effect.match(detectLanguageForRepository({ id, text, recordLanguage }), {
    onSuccess: language => ({ language, text }),
    onFailure: () => undefined,
  })
})

const detectLanguageForRepository = ({
  id,
  text,
  recordLanguage,
}: {
  id: DataciteDatasetId
  text: Html
  recordLanguage?: LanguageCode
}): Effect.Effect<LanguageCode, LanguageDetection.UnableToDetectLanguage, LanguageDetection.LanguageDetection> =>
  Match.valueTags(id, {
    DryadDatasetId: () => Effect.succeed('en' as const),
    ScieloDatasetId: () => LanguageDetection.detectLanguageFrom(['en', 'es', 'pt'], text, recordLanguage),
  })
