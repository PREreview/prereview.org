import { Url } from '@effect/platform'
import * as Doi from 'doi-ts'
import { Array, Effect, Either, flow, Match, type Option, pipe } from 'effect'
import { decode } from 'html-entities'
import type { LanguageCode } from 'iso-639-1'
import { detectLanguage, detectLanguageFrom } from '../../detect-language.ts'
import type { Crossref } from '../../ExternalApis/index.ts'
import { type Html, sanitizeHtml } from '../../html.ts'
import { transformJatsToHtml } from '../../jats.ts'
import { Iso639 } from '../../types/index.ts'
import * as Preprint from '../Preprint.ts'
import { BiorxivPreprintId, fromPreprintDoi, MedrxivPreprintId } from '../PreprintId.ts'
import { type CrossrefPreprintId, isDoiFromSupportedPublisher } from './PreprintId.ts'

const determineCrossrefPreprintId = (
  work: Crossref.Work,
): Either.Either<CrossrefPreprintId, Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const doi = work.DOI

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    if (Doi.hasRegistrant('12688')(doi) && work['group-title'] !== 'Gates Foundation') {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }))
    }

    if (Doi.hasRegistrant('31234')(doi) && work['group-title'] !== 'PsyArXiv') {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }))
    }

    if (Doi.hasRegistrant('31730')(doi) && work['group-title'] !== 'AfricArXiv') {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }))
    }

    if (Doi.hasRegistrant('35542')(doi) && work['group-title'] !== 'EdArXiv') {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }))
    }

    const indeterminateId = fromPreprintDoi(doi)

    if (indeterminateId._tag !== 'BiorxivOrMedrxivPreprintId') {
      return indeterminateId
    }

    const institutionName = work.institution?.[0].name

    if (institutionName === 'bioRxiv') {
      return new BiorxivPreprintId({ value: indeterminateId.value })
    }

    if (institutionName === 'medRxiv') {
      return new MedrxivPreprintId({ value: indeterminateId.value })
    }

    return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
  })

export const workToPreprint = (
  work: Crossref.Work,
): Effect.Effect<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Effect.gen(function* () {
    yield* ensureIsAPreprint(work)

    const id = yield* determineCrossrefPreprintId(work)

    const workLanguage = Iso639.isIso6391(work.language) ? work.language : undefined

    const authors = yield* getAuthors(work.author)

    const title = yield* getTitle(work.title, id, workLanguage)

    const abstract = yield* getAbstract(work.abstract, id, workLanguage)

    return Preprint.Preprint({
      authors,
      id,
      posted: work.published,
      title,
      abstract,
      url: Url.setProtocol(work.resource.primary.URL, 'https'),
    })
  })

const ensureIsAPreprint = (work: Crossref.Work): Either.Either<void, Preprint.NotAPreprint> =>
  work.type === 'posted-content' && work.subtype === 'preprint'
    ? Either.void
    : Either.left(new Preprint.NotAPreprint({ cause: { type: work.type, subtype: work.subtype } }))

const getAuthors = (
  author: Crossref.Work['author'],
): Either.Either<Preprint.Preprint['authors'], Preprint.PreprintIsUnavailable> =>
  Array.match(author, {
    onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { author } })),
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
): Effect.Effect<Preprint.Preprint['title'], Preprint.PreprintIsUnavailable> =>
  Array.match(title, {
    onEmpty: () => new Preprint.PreprintIsUnavailable({ cause: { title } }),
    onNonEmpty: flow(
      title => Effect.succeed({ text: sanitizeHtml(maybeDecode(title[0], id), { allowBlockLevel: false }) }),
      Effect.bind('language', ({ text }) =>
        Effect.orElse(
          Effect.flatten(detectLanguageForServer({ id, text, workLanguage })),
          () => new Preprint.PreprintIsUnavailable({ cause: 'unknown title language' }),
        ),
      ),
    ),
  })

const getAbstract = (
  abstract: Crossref.Work['abstract'],
  id: CrossrefPreprintId,
  workLanguage?: LanguageCode,
): Effect.Effect<Preprint.Preprint['abstract'], Preprint.PreprintIsUnavailable> =>
  abstract !== undefined
    ? pipe(
        Effect.succeed({
          text: transformJatsToHtml(maybeDecode(abstract, id)),
        }),
        Effect.bind('language', ({ text }) =>
          Effect.orElse(
            Effect.flatten(detectLanguageForServer({ id, text, workLanguage })),
            () => new Preprint.PreprintIsUnavailable({ cause: 'unknown abstract language' }),
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
}): Effect.Effect<Option.Option<LanguageCode>> =>
  Match.valueTags(id, {
    AdvancePreprintId: () => Effect.succeedSome('en' as const),
    AfricarxivOsfPreprintId: () => detectLanguageFrom('en', 'fr')(text, workLanguage),
    AuthoreaPreprintId: () => detectLanguage(text, workLanguage),
    BiorxivPreprintId: () => Effect.succeedSome('en' as const),
    ChemrxivPreprintId: () => Effect.succeedSome('en' as const),
    CurvenotePreprintId: () => Effect.succeedSome('en' as const),
    EartharxivPreprintId: () => Effect.succeedSome('en' as const),
    EcoevorxivPreprintId: () => Effect.succeedSome('en' as const),
    EdarxivPreprintId: () => detectLanguage(text, workLanguage),
    EngrxivPreprintId: () => Effect.succeedSome('en' as const),
    MedrxivPreprintId: () => Effect.succeedSome('en' as const),
    MetaarxivPreprintId: () => Effect.succeedSome('en' as const),
    NeurolibrePreprintId: () => Effect.succeedSome('en' as const),
    OsfPreprintsPreprintId: () => detectLanguage(text, workLanguage),
    PreprintsorgPreprintId: () => Effect.succeedSome('en' as const),
    PsyarxivPreprintId: () => detectLanguage(text, workLanguage),
    ResearchSquarePreprintId: () => Effect.succeedSome('en' as const),
    ScieloPreprintId: () => detectLanguageFrom('en', 'es', 'pt')(text, workLanguage),
    ScienceOpenPreprintId: () => detectLanguage(text, workLanguage),
    SocarxivPreprintId: () => detectLanguage(text, workLanguage),
    SsrnPreprintId: () => Effect.succeedSome('en' as const),
    TechrxivPreprintId: () => Effect.succeedSome('en' as const),
    UmsidaPreprintId: () => Effect.succeedSome('en' as const),
    VerixivPreprintId: () => Effect.succeedSome('en' as const),
  })
