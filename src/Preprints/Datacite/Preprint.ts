import { Url } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, flow, Match, Option, pipe, Struct } from 'effect'
import { encode } from 'html-entities'
import type { LanguageCode } from 'iso-639-1'
import { detectLanguage, detectLanguageFrom } from '../../detect-language.ts'
import type { Datacite } from '../../ExternalApis/index.ts'
import { type Html, sanitizeHtml } from '../../html.ts'
import { OrcidId } from '../../types/index.ts'
import * as Preprint from '../Preprint.ts'
import {
  AfricarxivZenodoPreprintId,
  fromPreprintDoi,
  LifecycleJournalPreprintId,
  OsfPreprintId,
  ZenodoPreprintId,
} from '../PreprintId.ts'
import { type DatacitePreprintId, isDoiFromSupportedPublisher } from './PreprintId.ts'

export const recordToPreprint = (
  record: Datacite.Record,
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const id = yield* determineDatacitePreprintId(record)

    if (
      record.types.resourceType?.toLowerCase() !== 'preprint' &&
      record.types.resourceTypeGeneral?.toLowerCase() !== 'preprint' &&
      (id._tag !== 'LifecycleJournalPreprintId' ||
        !['journalarticle', 'studyregistration'].includes(record.types.resourceTypeGeneral?.toLowerCase() as never)) &&
      (id._tag !== 'AfricarxivUbuntunetPreprintId' || record.types.resourceTypeGeneral?.toLowerCase() !== 'text') &&
      (id._tag !== 'ArxivPreprintId' || record.types.resourceTypeGeneral?.toLowerCase() !== 'text') &&
      (id._tag !== 'ArcadiaSciencePreprintId' || record.types.resourceTypeGeneral?.toLowerCase() !== 'other')
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

    const title = yield* getTitle(record.titles, id)

    const abstract = yield* getAbstract(record.descriptions, id)

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
  record: Datacite.Record,
): Either.Either<DatacitePreprintId, Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const doi = record.doi

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    const indeterminateId = fromPreprintDoi(doi)

    if (indeterminateId._tag === 'OsfOrLifecycleJournalPreprintId') {
      if (record.publisher === 'Lifecycle Journal') {
        return new LifecycleJournalPreprintId({ value: indeterminateId.value })
      }

      return new OsfPreprintId({ value: indeterminateId.value })
    }

    if (indeterminateId._tag === 'ZenodoOrAfricarxivPreprintId') {
      if (
        Array.some(
          record.relatedIdentifiers,
          ({ relationType, relatedIdentifier }) =>
            relationType === 'IsPartOf' && relatedIdentifier === 'https://zenodo.org/communities/africarxiv',
        )
      ) {
        return new AfricarxivZenodoPreprintId({ value: indeterminateId.value })
      }

      return new ZenodoPreprintId({ value: indeterminateId.value })
    }

    if (indeterminateId._tag === 'AfricarxivFigsharePreprintId' && record.publisher !== 'AfricArXiv') {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    return indeterminateId
  })

const findPublishedDate = (dates: Datacite.Record['dates']) =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Submitted')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Created')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Issued')),
    Option.andThen(Struct.get('date')),
    Option.andThen(date => (date instanceof Temporal.Instant ? date.toZonedDateTimeISO('UTC').toPlainDate() : date)),
  )

const findOrcid = (creator: Datacite.Record['creators'][number]) =>
  pipe(
    Array.findFirst(creator.nameIdentifiers, ({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID'),
    Option.andThen(({ nameIdentifier }) => OrcidId.parse(nameIdentifier)),
    Option.getOrUndefined,
  )

const getTitle = (
  titles: Datacite.Record['titles'],
  id: DatacitePreprintId,
): Either.Either<Preprint.Preprint['title'], Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const text = sanitizeHtml(titles[0].title)

    const language = yield* Either.fromOption(
      detectLanguageForServer({ id, text }),
      () => new Preprint.PreprintIsUnavailable({ cause: 'unknown title language' }),
    )

    return {
      language,
      text,
    }
  })

const getAbstract = (
  descriptions: Datacite.Record['descriptions'],
  id: DatacitePreprintId,
): Either.Either<Preprint.Preprint['abstract'], Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const abstract = Option.getOrUndefined(
      Array.findFirst(descriptions, ({ descriptionType }) => descriptionType === 'Abstract'),
    )

    if (!abstract) {
      return undefined
    }

    const text = pipe(
      Match.value(id),
      Match.tag('ZenodoPreprintId', () => sanitizeHtml(`<p>${encode(abstract.description)}</p>`)),
      Match.orElse(() => sanitizeHtml(`<p>${abstract.description}</p>`)),
    )

    const language = yield* Either.fromOption(
      detectLanguageForServer({ id, text }),
      () => new Preprint.PreprintIsUnavailable({ cause: 'unknown abstract language' }),
    )

    return {
      language,
      text,
    }
  })

const detectLanguageForServer = ({ id, text }: { id: DatacitePreprintId; text: Html }): Option.Option<LanguageCode> =>
  Match.valueTags(id, {
    AfricarxivFigsharePreprintId: () => detectLanguageFrom('en', 'fr')(text),
    AfricarxivUbuntunetPreprintId: () => detectLanguageFrom('en', 'fr')(text),
    AfricarxivZenodoPreprintId: () => detectLanguageFrom('en', 'fr')(text),
    ArcadiaSciencePreprintId: () => Option.some('en' as const),
    ArxivPreprintId: () => Option.some('en' as const),
    LifecycleJournalPreprintId: () => Option.some('en' as const),
    OsfPreprintId: () => detectLanguage(text),
    PsychArchivesPreprintId: () => detectLanguageFrom('de', 'en')(text),
    ZenodoPreprintId: () => detectLanguage(text),
  })
