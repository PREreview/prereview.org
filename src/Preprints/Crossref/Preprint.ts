import { Url } from '@effect/platform'
import * as Doi from 'doi-ts'
import { Array, Either, flow, Match, Option, pipe } from 'effect'
import { decode } from 'html-entities'
import type { LanguageCode } from 'iso-639-1'
import { detectLanguage, detectLanguageFrom } from '../../detect-language.ts'
import type { Crossref } from '../../ExternalApis/index.ts'
import { type Html, sanitizeHtml } from '../../html.ts'
import { transformJatsToHtml } from '../../jats.ts'
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
): Either.Either<Preprint.Preprint, Preprint.NotAPreprint | Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    if (work.type !== 'posted-content' || work.subtype !== 'preprint') {
      yield* Either.left(new Preprint.NotAPreprint({ cause: { type: work.type, subtype: work.subtype } }))
    }

    const id = yield* determineCrossrefPreprintId(work)

    const authors = yield* Array.match(work.author, {
      onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { author: work.author } })),
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

    const title = yield* Array.match(work.title, {
      onEmpty: () => Either.left(new Preprint.PreprintIsUnavailable({ cause: { title: work.title } })),
      onNonEmpty: flow(
        title => Either.right({ text: sanitizeHtml(maybeDecode(title[0], id), { allowBlockLevel: false }) }),
        Either.bind('language', ({ text }) =>
          Either.fromOption(
            detectLanguageForServer({ id, text }),
            () => new Preprint.PreprintIsUnavailable({ cause: 'unknown title language' }),
          ),
        ),
      ),
    })

    const abstract = yield* work.abstract !== undefined
      ? pipe(
          Either.right({
            text: transformJatsToHtml(maybeDecode(work.abstract, id)),
          }),
          Either.bind('language', ({ text }) =>
            Either.fromOption(
              detectLanguageForServer({ id, text }),
              () => new Preprint.PreprintIsUnavailable({ cause: 'unknown abstract language' }),
            ),
          ),
        )
      : Either.right(undefined)

    return Preprint.Preprint({
      authors,
      id,
      posted: work.published,
      title,
      abstract,
      url: Url.setProtocol(work.resource.primary.URL, 'https'),
    })
  })

const maybeDecode = (text: string, preprintId: CrossrefPreprintId): string =>
  preprintId._tag === 'PreprintsorgPreprintId'
    ? text.startsWith('&lt;') || text.includes('&lt;em&gt;') || text.includes('&amp;aacute;')
      ? decode(text)
      : text
    : text

const detectLanguageForServer = ({ id, text }: { id: CrossrefPreprintId; text: Html }): Option.Option<LanguageCode> =>
  Match.valueTags(id, {
    AdvancePreprintId: () => Option.some('en' as const),
    AfricarxivOsfPreprintId: () => detectLanguageFrom('en', 'fr')(text),
    AuthoreaPreprintId: () => detectLanguage(text),
    BiorxivPreprintId: () => Option.some('en' as const),
    ChemrxivPreprintId: () => Option.some('en' as const),
    CurvenotePreprintId: () => Option.some('en' as const),
    EartharxivPreprintId: () => Option.some('en' as const),
    EcoevorxivPreprintId: () => Option.some('en' as const),
    EdarxivPreprintId: () => detectLanguage(text),
    EngrxivPreprintId: () => Option.some('en' as const),
    MedrxivPreprintId: () => Option.some('en' as const),
    MetaarxivPreprintId: () => Option.some('en' as const),
    NeurolibrePreprintId: () => Option.some('en' as const),
    OsfPreprintsPreprintId: () => detectLanguage(text),
    PreprintsorgPreprintId: () => Option.some('en' as const),
    PsyarxivPreprintId: () => detectLanguage(text),
    ResearchSquarePreprintId: () => Option.some('en' as const),
    ScieloPreprintId: () => detectLanguageFrom('en', 'es', 'pt')(text),
    ScienceOpenPreprintId: () => detectLanguage(text),
    SocarxivPreprintId: () => detectLanguage(text),
    SsrnPreprintId: () => Option.some('en' as const),
    TechrxivPreprintId: () => Option.some('en' as const),
    VerixivPreprintId: () => Option.some('en' as const),
  })
