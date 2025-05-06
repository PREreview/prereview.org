import { Url } from '@effect/platform'
import * as Doi from 'doi-ts'
import { Array, Either, flow, Match, Option, pipe } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import { detectLanguageFrom } from '../detect-language.js'
import { type Html, sanitizeHtml } from '../html.js'
import { transformJatsToHtml } from '../jats.js'
import * as Preprint from '../preprint.js'
import { fromPreprintDoi } from '../types/preprint-id.js'
import { type CrossrefPreprintId, isDoiFromSupportedPublisher } from './PreprintId.js'
import type { Work } from './Work.js'

const determineCrossrefPreprintId = (work: Work): Either.Either<CrossrefPreprintId, Preprint.PreprintIsUnavailable> =>
  Either.gen(function* () {
    const doi = work.DOI

    if (!isDoiFromSupportedPublisher(doi)) {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
    }

    if (Doi.hasRegistrant('12688')(doi) && work['group-title'] !== 'Gates Foundation') {
      return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: { doi, groupTitle: work['group-title'] } }))
    }

    const indeterminateId = fromPreprintDoi(doi)

    if (indeterminateId._tag !== 'biorxiv-medrxiv') {
      return indeterminateId
    }

    const institutionName = work.institution?.[0].name

    if (institutionName === 'bioRxiv') {
      return {
        value: indeterminateId.value,
        _tag: 'biorxiv',
      }
    }

    if (institutionName === 'medRxiv') {
      return {
        value: indeterminateId.value,
        _tag: 'medrxiv',
      }
    }

    return yield* Either.left(new Preprint.PreprintIsUnavailable({ cause: doi }))
  })

export const workToPreprint = (
  work: Work,
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
        title => Either.right({ text: sanitizeHtml(title[0]) }),
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
          Either.right({ text: transformJatsToHtml(work.abstract) }),
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

const detectLanguageForServer = ({ id, text }: { id: CrossrefPreprintId; text: Html }): Option.Option<LanguageCode> =>
  Match.valueTags(id, {
    biorxiv: () => Option.some('en' as const),
    medrxiv: () => Option.some('en' as const),
    neurolibre: () => Option.some('en' as const),
    'preprints.org': () => Option.some('en' as const),
    'research-square': () => Option.some('en' as const),
    scielo: () => detectLanguageFrom('en', 'es', 'pt')(text),
    ssrn: () => Option.some('en' as const),
    verixiv: () => Option.some('en' as const),
  })
