import { Url } from '@effect/platform'
import { Array, Either, flow, Match, Option, pipe, Struct } from 'effect'
import { detectLanguage } from '../detect-language.js'
import { html } from '../html.js'
import * as Preprint from '../preprint.js'
import { type DatacitePreprintId, isDoiFromSupportedPublisher } from './PreprintId.js'
import type { Record } from './Record.js'

export const recordToPreprint = (
  record: Record,
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    if (
      record.types.resourceType?.toLowerCase() !== 'preprint' &&
      record.types.resourceTypeGeneral?.toLowerCase() !== 'preprint'
    ) {
      yield* Either.left(new Preprint.NotAPreprint({ cause: record.types }))
    }

    const id = yield* determineDatacitePreprintId(record)

    const authors = yield* Array.match(record.creators, {
      onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { creators: record.creators } })),
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

    const title = yield* getTitle(record.titles)

    const posted = yield* Either.fromOption(
      findPublishedDate(record.dates),
      () => new Preprint.PreprintIsUnavailable({ cause: { dates: record.dates } }),
    )

    return Preprint.Preprint({
      authors,
      id,
      posted,
      title,
      url: Url.setProtocol(record.url, 'https'),
    })
  })

const determineDatacitePreprintId = (
  record: Record,
): Either.Either<DatacitePreprintId, Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const doi = record.doi

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    return { type: 'osf', value: doi } satisfies DatacitePreprintId
  })

const findPublishedDate = (dates: Record['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Submitted')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Created')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Issued')),
    Option.andThen(Struct.get('date')),
  )

const getTitle = (
  titles: Record['titles'],
): Either.Either<Preprint.Preprint['title'], Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const text = html`${titles[0].title}`

    const language = yield* Either.fromOption(
      detectLanguage(text),
      () => new Preprint.PreprintIsUnavailable({ cause: 'unknown title language' }),
    )

    return {
      language,
      text,
    }
  })
