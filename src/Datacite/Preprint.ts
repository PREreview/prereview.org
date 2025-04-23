import { Url } from '@effect/platform'
import { Array, Either, flow, Match, Option, pipe, Struct } from 'effect'
import { detectLanguage } from '../detect-language.js'
import { sanitizeHtml } from '../html.js'
import * as Preprint from '../preprint.js'
import { Orcid } from '../types/index.js'
import { type DatacitePreprintId, isDoiFromSupportedPublisher } from './PreprintId.js'
import type { Record } from './Record.js'

export const recordToPreprint = (
  record: Record,
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const id = yield* determineDatacitePreprintId(record)

    if (
      record.types.resourceType?.toLowerCase() !== 'preprint' &&
      record.types.resourceTypeGeneral?.toLowerCase() !== 'preprint' &&
      (id._tag !== 'lifecycle-journal' ||
        !['journalarticle', 'studyregistration'].includes(record.types.resourceTypeGeneral?.toLowerCase() as never))
    ) {
      yield* Either.left(new Preprint.NotAPreprint({ cause: record.types }))
    }

    const authors = yield* Array.match(record.creators, {
      onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { creators: record.creators } })),
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

    const title = yield* getTitle(record.titles)

    const abstract = yield* getAbstract(record.descriptions)

    const posted = yield* Either.fromOption(
      findPublishedDate(record.dates),
      () => new Preprint.PreprintIsUnavailable({ cause: { dates: record.dates } }),
    )

    return Preprint.Preprint({
      abstract,
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

    if (record.publisher === 'Lifecycle Journal') {
      return { _tag: 'lifecycle-journal', value: doi }
    }

    return { _tag: 'osf', value: doi } satisfies DatacitePreprintId
  })

const findPublishedDate = (dates: Record['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Submitted')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Created')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Issued')),
    Option.andThen(Struct.get('date')),
  )

const findOrcid = (creator: Record['creators'][number]) =>
  pipe(
    Array.findFirst(creator.nameIdentifiers, ({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID'),
    Option.andThen(({ nameIdentifier }) => Orcid.parse(nameIdentifier)),
    Option.getOrUndefined,
  )

const getTitle = (
  titles: Record['titles'],
): Either.Either<Preprint.Preprint['title'], Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const text = sanitizeHtml(titles[0].title)

    const language = yield* Either.fromOption(
      detectLanguage(text),
      () => new Preprint.PreprintIsUnavailable({ cause: 'unknown title language' }),
    )

    return {
      language,
      text,
    }
  })

const getAbstract = (
  descriptions: Record['descriptions'],
): Either.Either<Preprint.Preprint['abstract'], Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const abstract = yield* Either.fromOption(
      Array.findFirst(descriptions, ({ descriptionType }) => descriptionType === 'Abstract'),
      () => new Preprint.PreprintIsUnavailable({ cause: { descriptions } }),
    )

    const text = sanitizeHtml(`<p>${abstract.description}</p>`)

    const language = yield* Either.fromOption(
      detectLanguage(text),
      () => new Preprint.PreprintIsUnavailable({ cause: 'unknown abstract language' }),
    )

    return {
      language,
      text,
    }
  })
