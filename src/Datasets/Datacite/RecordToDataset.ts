import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, flow, Match, Option, pipe, Struct } from 'effect'
import type { Datacite } from '../../ExternalApis/index.js'
import { sanitizeHtml } from '../../html.js'
import * as Dataset from '../Dataset.js'
import * as DatasetId from '../DatasetId.js'

export class RecordIsNotSupported extends Data.TaggedError('RecordIsNotSupported')<{
  cause?: unknown
}> {}

export const RecordToDataset = (
  record: Datacite.Record,
): Either.Either<Dataset.Dataset, Dataset.NotADataset | Dataset.DatasetIsUnavailable | RecordIsNotSupported> =>
  Either.gen(function* () {
    if (!DatasetId.isDatasetDoi(record.doi)) {
      return yield* Either.left(new RecordIsNotSupported({ cause: record.doi }))
    }

    const datasetId = new DatasetId.DryadDatasetId({ value: record.doi })

    if (record.types.resourceType?.toLowerCase() !== 'dataset') {
      return yield* Either.left(new Dataset.NotADataset({ cause: record.types, datasetId }))
    }

    const authors = yield* Array.match(record.creators, {
      onEmpty: () => Either.left(new Dataset.DatasetIsUnavailable({ cause: { creators: record.creators }, datasetId })),
      onNonEmpty: creators =>
        Either.right(
          Array.map(
            creators,
            flow(
              Match.value,
              Match.when({ name: Match.string }, creator => ({ name: creator.name })),
              Match.when({ givenName: Match.string, familyName: Match.string }, creator => ({
                name: `${creator.givenName} ${creator.familyName}`,
              })),
              Match.exhaustive,
            ),
          ),
        ),
    })

    const abstract = getAbstract(record.descriptions)

    const posted = yield* Either.fromOption(
      findPublishedDate(record.dates),
      () => new Dataset.DatasetIsUnavailable({ cause: { dates: record.dates }, datasetId }),
    )

    return new Dataset.Dataset({
      abstract,
      authors,
      id: datasetId,
      posted,
      title: {
        text: sanitizeHtml(record.titles[0].title),
        language: 'en',
      },
      url: record.url,
    })
  })

const findPublishedDate = (dates: Datacite.Record['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Available')),
    Option.andThen(Struct.get('date')),
    Option.andThen(date => (date instanceof Temporal.Instant ? date.toZonedDateTimeISO('UTC').toPlainDate() : date)),
  )

const getAbstract = (descriptions: Datacite.Record['descriptions']): Dataset.Dataset['abstract'] => {
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
