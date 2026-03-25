import { Url } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Effect, Either, flow, Match, Option, pipe, Struct } from 'effect'
import { encode } from 'html-entities'
import type { LanguageCode } from 'iso-639-1'
import type { Datacite } from '../../../ExternalApis/index.ts'
import { type Html, sanitizeHtml } from '../../../html.ts'
import * as Preprints from '../../../Preprints/index.ts'
import {
  AfricarxivZenodoPreprintId,
  fromPreprintDoi,
  LifecycleJournalPreprintId,
  OsfPreprintId,
  ZenodoPreprintId,
} from '../../../Preprints/index.ts'
import { Iso639, OrcidId } from '../../../types/index.ts'
import * as LanguageDetection from '../../LanguageDetection/index.ts'
import { type DatacitePreprintId, isDoiFromSupportedPublisher } from './PreprintId.ts'

export const recordToPreprint = (
  record: Datacite.Record,
): Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsUnavailable,
  LanguageDetection.LanguageDetection
> =>
  Effect.gen(function* () {
    const id = yield* determineDatacitePreprintId(record)

    yield* ensureIsAPreprint(record.types, id)

    const recordLanguage = Iso639.isIso6391(record.language) ? record.language : undefined

    const authors = yield* getAuthors(record.creators)

    const title = yield* getTitle(record.titles, id, recordLanguage)

    const abstract = yield* getAbstract(record.descriptions, id, recordLanguage)

    const posted = yield* getPostedDate(record.dates)

    return Preprints.Preprint({
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
): Either.Either<DatacitePreprintId, Preprints.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const doi = record.doi

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new Preprints.PreprintIsUnavailable({ cause: doi }))
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
      return yield* Either.left(new Preprints.PreprintIsUnavailable({ cause: doi }))
    }

    return indeterminateId
  })

const ensureIsAPreprint = (
  types: Datacite.Record['types'],
  id: DatacitePreprintId,
): Either.Either<void, Preprints.NotAPreprint> =>
  types.resourceType?.toLowerCase() === 'preprint' ||
  types.resourceTypeGeneral?.toLowerCase() === 'preprint' ||
  (id._tag === 'LifecycleJournalPreprintId' &&
    ['journalarticle', 'studyregistration'].includes(types.resourceTypeGeneral?.toLowerCase() as never)) ||
  (id._tag === 'AfricarxivUbuntunetPreprintId' && types.resourceTypeGeneral?.toLowerCase() === 'text') ||
  (id._tag === 'ArxivPreprintId' && types.resourceTypeGeneral?.toLowerCase() === 'text') ||
  (id._tag === 'ArcadiaSciencePreprintId' && types.resourceTypeGeneral?.toLowerCase() == 'other')
    ? Either.void
    : Either.left(new Preprints.NotAPreprint({ cause: types }))

const getPostedDate = (
  dates: Datacite.Record['dates'],
): Either.Either<Preprints.Preprint['posted'], Preprints.PreprintIsUnavailable> =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Submitted')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Created')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Issued')),
    Option.andThen(Struct.get('date')),
    Option.andThen(date => (date instanceof Temporal.Instant ? date.toZonedDateTimeISO('UTC').toPlainDate() : date)),
    Option.filter(
      date => date instanceof Temporal.PlainDate || date instanceof Temporal.PlainYearMonth || typeof date === 'number',
    ),
    Either.fromOption(() => new Preprints.PreprintIsUnavailable({ cause: { dates } })),
  )

const findOrcid = (creator: Datacite.Record['creators'][number]) =>
  pipe(
    Array.findFirst(creator.nameIdentifiers, ({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID'),
    Option.andThen(({ nameIdentifier }) => OrcidId.parse(nameIdentifier)),
    Option.getOrUndefined,
  )

const getAuthors = (
  creators: Datacite.Record['creators'],
): Either.Either<Preprints.Preprint['authors'], Preprints.PreprintIsUnavailable> =>
  Array.match(creators, {
    onEmpty: () => Either.left(new Preprints.PreprintIsUnavailable({ cause: { creators } })),
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

const getTitle = (
  titles: Datacite.Record['titles'],
  id: DatacitePreprintId,
  recordLanguage?: LanguageCode,
): Effect.Effect<Preprints.Preprint['title'], Preprints.PreprintIsUnavailable, LanguageDetection.LanguageDetection> =>
  Effect.gen(function* () {
    const text = sanitizeHtml(titles[0].title, { allowBlockLevel: false })

    const language = yield* Effect.catchTag(
      detectLanguageForServer({ id, text, recordLanguage }),
      'UnableToDetectLanguage',
      error => new Preprints.PreprintIsUnavailable({ cause: error }),
    )

    return {
      language,
      text,
    }
  })

const getAbstract = (
  descriptions: Datacite.Record['descriptions'],
  id: DatacitePreprintId,
  recordLanguage?: LanguageCode,
): Effect.Effect<Preprints.Preprint['abstract'], never, LanguageDetection.LanguageDetection> =>
  Effect.gen(function* () {
    const abstract = Option.getOrUndefined(
      Array.findFirst(descriptions, ({ descriptionType }) => descriptionType === 'Abstract'),
    )

    if (!abstract) {
      return
    }

    const text = pipe(
      Match.value(id),
      Match.tag('ZenodoPreprintId', () =>
        sanitizeHtml(`<p>${encode(abstract.description).replaceAll(/\s*\n\n\s*/g, '</p>\n\n<p>')}</p>`),
      ),
      Match.orElse(() => sanitizeHtml(`<p>${abstract.description.replaceAll(/\s*\n\n\s*/g, '</p>\n\n<p>')}</p>`)),
    )

    return yield* Effect.match(detectLanguageForServer({ id, text, recordLanguage }), {
      onSuccess: language => ({ language, text }),
      onFailure: () => undefined,
    })
  })

const detectLanguageForServer = ({
  id,
  text,
  recordLanguage: recordLanguage,
}: {
  id: DatacitePreprintId
  text: Html
  recordLanguage?: LanguageCode
}): Effect.Effect<LanguageCode, LanguageDetection.UnableToDetectLanguage, LanguageDetection.LanguageDetection> =>
  Match.valueTags(id, {
    AfricarxivFigsharePreprintId: () => LanguageDetection.detectLanguageFrom(['en', 'fr'], text, recordLanguage),
    AfricarxivUbuntunetPreprintId: () => LanguageDetection.detectLanguageFrom(['en', 'fr'], text, recordLanguage),
    AfricarxivZenodoPreprintId: () => LanguageDetection.detectLanguageFrom(['en', 'fr'], text, recordLanguage),
    ArcadiaSciencePreprintId: () => Effect.succeed('en' as const),
    ArxivPreprintId: () => Effect.succeed('en' as const),
    LifecycleJournalPreprintId: () => Effect.succeed('en' as const),
    OsfPreprintId: () => LanguageDetection.detectLanguage(text, recordLanguage),
    PsychArchivesPreprintId: () => LanguageDetection.detectLanguageFrom(['de', 'en'], text, recordLanguage),
    ZenodoPreprintId: () => LanguageDetection.detectLanguage(text, recordLanguage),
  })
