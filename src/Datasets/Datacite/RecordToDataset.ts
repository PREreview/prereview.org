import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, flow, Match, Option, pipe, Struct } from 'effect'
import type { Datacite } from '../../ExternalApis/index.ts'
import { sanitizeHtml } from '../../html.ts'
import { OrcidId } from '../../types/index.ts'
import * as Dataset from '../Dataset.ts'
import * as DatasetId from '../DatasetId.ts'

export class RecordIsNotSupported extends Data.TaggedError('RecordIsNotSupported')<{
  cause?: unknown
}> {}

export const RecordToDataset = (
  record: Datacite.Record,
): Either.Either<Dataset.Dataset, Dataset.NotADataset | Dataset.DatasetIsUnavailable | RecordIsNotSupported> =>
  Either.gen(function* () {
    const datasetId = yield* Either.fromOption(
      DatasetId.parseDatasetDoi(record.doi),
      () => new RecordIsNotSupported({ cause: record.doi }),
    )

    if (record.relationships.provider.toLowerCase() !== 'dryad') {
      return yield* Either.left(new RecordIsNotSupported({ cause: Struct.pick(record.relationships, 'provider') }))
    }

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
      () => new Dataset.DatasetIsUnavailable({ cause: { dates: record.dates }, datasetId }),
    )

    return new Dataset.Dataset({
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

const findPublishedDate = (dates: Datacite.Record['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Available')),
    Option.andThen(Struct.get('date')),
    Option.andThen(date => (date instanceof Temporal.Instant ? date.toZonedDateTimeISO('UTC').toPlainDate() : date)),
  )

const findOrcid = (creator: Datacite.Record['creators'][number]) =>
  pipe(
    Array.findFirst(creator.nameIdentifiers, ({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID'),
    Option.andThen(({ nameIdentifier }) => OrcidId.parse(nameIdentifier)),
    Option.getOrUndefined,
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
