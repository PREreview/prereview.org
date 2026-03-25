import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, flow, Match, Option, pipe, Struct } from 'effect'
import * as Datasets from '../../../Datasets/index.ts'
import type { Datacite } from '../../../ExternalApis/index.ts'
import { sanitizeHtml } from '../../../html.ts'
import { OrcidId } from '../../../types/index.ts'
import { IsDoiFromSupportedPublisher, type DataciteDatasetId } from './DatasetId.ts'

export class RecordIsNotSupported extends Data.TaggedError('RecordIsNotSupported')<{
  cause?: unknown
}> {}

export const RecordToDataset = (
  record: Datacite.Record,
): Either.Either<Datasets.Dataset, Datasets.NotADataset | Datasets.DatasetIsUnavailable | RecordIsNotSupported> =>
  Either.gen(function* () {
    const datasetId = yield* determineDataciteDatasetId(record)

    if (record.types.resourceType?.toLowerCase() !== 'dataset') {
      return yield* Either.left(new Datasets.NotADataset({ cause: record.types, datasetId }))
    }

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

    const abstract = getAbstract(record.descriptions)

    const posted = yield* Either.fromOption(
      findPublishedDate(record.dates),
      () => new Datasets.DatasetIsUnavailable({ cause: { dates: record.dates }, datasetId }),
    )

    return new Datasets.Dataset({
      abstract,
      authors,
      id: datasetId,
      posted,
      title: {
        text: sanitizeHtml(record.titles[0].title, { allowBlockLevel: false }),
        language: 'en',
      },
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

const getAbstract = (descriptions: Datacite.Record['descriptions']): Datasets.Dataset['abstract'] => {
  const abstract = Option.getOrUndefined(
    Array.findFirst(descriptions, ({ descriptionType }) => descriptionType === 'Abstract'),
  )

  if (!abstract) {
    return undefined
  }

  const text = sanitizeHtml(`<p>${abstract.description}</p>`)

  return {
    language: 'en',
    text,
  }
}
