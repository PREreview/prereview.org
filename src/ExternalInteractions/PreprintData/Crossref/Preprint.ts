import { Url } from '@effect/platform'
import * as Doi from 'doi-ts'
import { Array, Effect, Either, flow, Match, pipe } from 'effect'
import { decode } from 'html-entities'
import type { LanguageCode } from 'iso-639-1'
import type { Crossref } from '../../../ExternalApis/index.ts'
import { type Html, sanitizeHtml } from '../../../html.ts'
import { transformJatsToHtml } from '../../../jats.ts'
import * as Preprints from '../../../Preprints/index.ts'
import { Iso639 } from '../../../types/index.ts'
import * as LanguageDetection from '../../LanguageDetection/index.ts'
import { type CrossrefPreprintId, isDoiFromSupportedPublisher } from './PreprintId.ts'

const determineCrossrefPreprintId = (
  work: Crossref.Work,
): Either.Either<CrossrefPreprintId, Preprints.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const doi = work.DOI

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new Preprints.PreprintIsUnavailable({ cause: doi }))
    }

    if (Doi.hasRegistrant('12688')(doi) && work['group-title'] !== 'Gates Foundation') {
      return yield* Either.left(
        new Preprints.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }),
      )
    }

    if (Doi.hasRegistrant('31234')(doi) && work['group-title'] !== 'PsyArXiv') {
      return yield* Either.left(
        new Preprints.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }),
      )
    }

    if (Doi.hasRegistrant('31730')(doi) && work['group-title'] !== 'AfricArXiv') {
      return yield* Either.left(
        new Preprints.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }),
      )
    }

    if (Doi.hasRegistrant('35542')(doi) && work['group-title'] !== 'EdArXiv') {
      return yield* Either.left(
        new Preprints.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }),
      )
    }

    const indeterminateId = Preprints.fromPreprintDoi(doi)

    if (indeterminateId._tag !== 'BiorxivOrMedrxivPreprintId') {
      return indeterminateId
    }

    const institutionName = work.institution?.[0].name

    if (institutionName === 'bioRxiv') {
      return new Preprints.BiorxivPreprintId({ value: indeterminateId.value })
    }

    if (institutionName === 'medRxiv') {
      return new Preprints.MedrxivPreprintId({ value: indeterminateId.value })
    }

    return yield* Either.left(new Preprints.PreprintIsUnavailable({ cause: doi }))
  })

export const workToPreprint = (
  work: Crossref.Work,
): Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsUnavailable,
  LanguageDetection.LanguageDetection
> =>
  Effect.gen(function* () {
    yield* ensureIsAPreprint(work)

    const id = yield* determineCrossrefPreprintId(work)

    const workLanguage = Iso639.isIso6391(work.language) ? work.language : undefined

    const authors = yield* getAuthors(work.author)

    const title = yield* getTitle(work.title, id, workLanguage)

    const abstract = yield* getAbstract(work.abstract, id, workLanguage)

    return Preprints.Preprint({
      authors,
      id,
      posted: work.published,
      title,
      abstract,
      url: Url.setProtocol(work.resource.primary.URL, 'https'),
    })
  })

const ensureIsAPreprint = (work: Crossref.Work): Either.Either<void, Preprints.NotAPreprint> =>
  work.type === 'posted-content' && work.subtype === 'preprint'
    ? Either.void
    : Either.left(new Preprints.NotAPreprint({ cause: { type: work.type, subtype: work.subtype } }))

const getAuthors = (
  author: Crossref.Work['author'],
): Either.Either<Preprints.Preprint['authors'], Preprints.PreprintIsUnavailable> =>
  Array.match(author, {
    onEmpty: () => Either.left(new Preprints.PreprintIsUnavailable({ cause: { author } })),
    onNonEmpty: authors =>
      Either.right(
        Array.map(
          authors,
          flow(
            Match.value,
            Match.when({ given: Match.string }, author => ({
              name: `${author.given} ${author.family}`,
              orcid: author.ORCID,
            })),
            Match.when({ family: Match.string }, author => ({
              name: author.family,
              orcid: author.ORCID,
            })),
            Match.when({ name: Match.string }, author => ({
              name: author.name,
              orcid: undefined,
            })),
            Match.exhaustive,
          ),
        ),
      ),
  })

const getTitle = (
  title: Crossref.Work['title'],
  id: CrossrefPreprintId,
  workLanguage?: LanguageCode,
): Effect.Effect<Preprints.Preprint['title'], Preprints.PreprintIsUnavailable, LanguageDetection.LanguageDetection> =>
  Array.match(title, {
    onEmpty: () => new Preprints.PreprintIsUnavailable({ cause: { title } }),
    onNonEmpty: flow(
      title => Effect.succeed({ text: sanitizeHtml(maybeDecode(title[0], id), { allowBlockLevel: false }) }),
      Effect.bind('language', ({ text }) =>
        Effect.catchTag(
          detectLanguageForServer({ id, text, workLanguage }),
          'UnableToDetectLanguage',
          error => new Preprints.PreprintIsUnavailable({ cause: error }),
        ),
      ),
    ),
  })

const getAbstract = (
  abstract: Crossref.Work['abstract'],
  id: CrossrefPreprintId,
  workLanguage?: LanguageCode,
): Effect.Effect<
  Preprints.Preprint['abstract'],
  Preprints.PreprintIsUnavailable,
  LanguageDetection.LanguageDetection
> =>
  abstract !== undefined
    ? pipe(
        Effect.succeed({
          text: transformJatsToHtml(maybeDecode(abstract, id)),
        }),
        Effect.bind('language', ({ text }) =>
          Effect.catchTag(
            detectLanguageForServer({ id, text, workLanguage }),
            'UnableToDetectLanguage',
            error => new Preprints.PreprintIsUnavailable({ cause: error }),
          ),
        ),
      )
    : Effect.succeed(undefined)

const maybeDecode = (text: string, preprintId: CrossrefPreprintId): string =>
  preprintId._tag === 'PreprintsorgPreprintId'
    ? text.startsWith('&lt;') || /&lt;[a-z]+&gt;|&amp;[a-z]+;/i.test(text)
      ? decode(text)
      : text
    : text

const detectLanguageForServer = ({
  id,
  text,
  workLanguage,
}: {
  id: CrossrefPreprintId
  text: Html
  workLanguage?: LanguageCode
}): Effect.Effect<LanguageCode, LanguageDetection.UnableToDetectLanguage, LanguageDetection.LanguageDetection> =>
  Match.valueTags(id, {
    AdvancePreprintId: () => Effect.succeed('en' as const),
    AfricarxivOsfPreprintId: () => LanguageDetection.detectLanguageFrom('en', 'fr')(text, workLanguage),
    AuthoreaPreprintId: () => LanguageDetection.detectLanguage(text, workLanguage),
    BiorxivPreprintId: () => Effect.succeed('en' as const),
    ChemrxivPreprintId: () => Effect.succeed('en' as const),
    CurvenotePreprintId: () => Effect.succeed('en' as const),
    EartharxivPreprintId: () => Effect.succeed('en' as const),
    EcoevorxivPreprintId: () => Effect.succeed('en' as const),
    EdarxivPreprintId: () => LanguageDetection.detectLanguage(text, workLanguage),
    EngrxivPreprintId: () => Effect.succeed('en' as const),
    MedrxivPreprintId: () => Effect.succeed('en' as const),
    MetaarxivPreprintId: () => Effect.succeed('en' as const),
    NeurolibrePreprintId: () => Effect.succeed('en' as const),
    OsfPreprintsPreprintId: () => LanguageDetection.detectLanguage(text, workLanguage),
    PreprintsorgPreprintId: () => Effect.succeed('en' as const),
    PsyarxivPreprintId: () => LanguageDetection.detectLanguage(text, workLanguage),
    ResearchSquarePreprintId: () => Effect.succeed('en' as const),
    ScieloPreprintId: () => LanguageDetection.detectLanguageFrom('en', 'es', 'pt')(text, workLanguage),
    ScienceOpenPreprintId: () => LanguageDetection.detectLanguage(text, workLanguage),
    SocarxivPreprintId: () => LanguageDetection.detectLanguage(text, workLanguage),
    SsrnPreprintId: () => Effect.succeed('en' as const),
    TechrxivPreprintId: () => Effect.succeed('en' as const),
    UmsidaPreprintId: () => Effect.succeed('en' as const),
    VerixivPreprintId: () => Effect.succeed('en' as const),
  })
