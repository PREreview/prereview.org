import { Url } from '@effect/platform'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Effect, Either, flow, Match, Option, pipe, Struct } from 'effect'
import { encode } from 'html-entities'
import type { LanguageCode } from 'iso-639-1'
import { detectLanguage, detectLanguageFrom } from '../../detect-language.ts'
import type { Datacite } from '../../ExternalApis/index.ts'
import { type Html, sanitizeHtml } from '../../html.ts'
import { Iso639, OrcidId } from '../../types/index.ts'
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
): Effect.Effect<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Effect.gen(function* () {
    const id = yield* determineDatacitePreprintId(record)

    yield* ensureIsAPreprint(record.types, id)

    const recordLanguage = Iso639.isIso6391(record.language) ? record.language : undefined

    const authors = yield* getAuthors(record.creators)

    const title = yield* getTitle(record.titles, id, recordLanguage)

    const abstract = yield* getAbstract(record.descriptions, id, recordLanguage)

    const posted = yield* getPostedDate(record.dates)

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

const ensureIsAPreprint = (
  types: Datacite.Record['types'],
  id: DatacitePreprintId,
): Either.Either<void, Preprint.NotAPreprint> =>
  types.resourceType?.toLowerCase() === 'preprint' ||
  types.resourceTypeGeneral?.toLowerCase() === 'preprint' ||
  (id._tag === 'LifecycleJournalPreprintId' &&
    ['journalarticle', 'studyregistration'].includes(types.resourceTypeGeneral?.toLowerCase() as never)) ||
  (id._tag === 'AfricarxivUbuntunetPreprintId' && types.resourceTypeGeneral?.toLowerCase() === 'text') ||
  (id._tag === 'ArxivPreprintId' && types.resourceTypeGeneral?.toLowerCase() === 'text') ||
  (id._tag === 'ArcadiaSciencePreprintId' && types.resourceTypeGeneral?.toLowerCase() == 'other')
    ? Either.void
    : Either.left(new Preprint.NotAPreprint({ cause: types }))

const getPostedDate = (
  dates: Datacite.Record['dates'],
): Either.Either<Preprint.Preprint['posted'], Preprint.PreprintIsUnavailable> =>
  pipe(
    Option.none(),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Submitted')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Created')),
    Option.orElse(() => Array.findFirst(dates, ({ dateType }) => dateType === 'Issued')),
    Option.andThen(Struct.get('date')),
    Option.andThen(date => (date instanceof Temporal.Instant ? date.toZonedDateTimeISO('UTC').toPlainDate() : date)),
    Either.fromOption(() => new Preprint.PreprintIsUnavailable({ cause: { dates } })),
  )

const findOrcid = (creator: Datacite.Record['creators'][number]) =>
  pipe(
    Array.findFirst(creator.nameIdentifiers, ({ nameIdentifierScheme }) => nameIdentifierScheme === 'ORCID'),
    Option.andThen(({ nameIdentifier }) => OrcidId.parse(nameIdentifier)),
    Option.getOrUndefined,
  )

const getAuthors = (
  creators: Datacite.Record['creators'],
): Either.Either<Preprint.Preprint['authors'], Preprint.PreprintIsUnavailable> =>
  Array.match(creators, {
    onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { creators } })),
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
): Effect.Effect<Preprint.Preprint['title'], Preprint.PreprintIsUnavailable> =>
  Effect.gen(function* () {
    const text = sanitizeHtml(titles[0].title, { allowBlockLevel: false })

    const language = yield* Effect.orElse(
      Effect.flatten(detectLanguageForServer({ id, text, recordLanguage })),
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
  recordLanguage?: LanguageCode,
): Effect.Effect<Preprint.Preprint['abstract']> =>
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

    return yield* Effect.match(Effect.flatten(detectLanguageForServer({ id, text, recordLanguage })), {
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
}): Effect.Effect<Option.Option<LanguageCode>> =>
  Match.valueTags(id, {
    AfricarxivFigsharePreprintId: () => detectLanguageFrom('en', 'fr')(text),
    AfricarxivUbuntunetPreprintId: () => detectLanguageFrom('en', 'fr')(text),
    AfricarxivZenodoPreprintId: () => detectLanguageFrom('en', 'fr')(text),
    ArcadiaSciencePreprintId: () => Effect.succeedSome('en' as const),
    ArxivPreprintId: () => Effect.succeedSome('en' as const),
    LifecycleJournalPreprintId: () => Effect.succeedSome('en' as const),
    OsfPreprintId: () => detectLanguage(text, recordLanguage),
    PsychArchivesPreprintId: () => detectLanguageFrom('de', 'en')(text),
    ZenodoPreprintId: () => detectLanguage(text, recordLanguage),
  })
