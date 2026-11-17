import { Array, Effect, flow, Number, Option, Record, Struct } from 'effect'
import { encode } from 'html-entities'
import type { LanguageCode } from 'iso-639-1'
import * as Preprints from '../../../Domain/Preprints/index.ts'
import type { OpenAlex } from '../../../ExternalApis/index.ts'
import { type Html, sanitizeHtml } from '../../../html.ts'
import { Iso639 } from '../../../types/index.ts'
import * as LanguageDetection from '../../LanguageDetection/index.ts'

export const workToPreprint = (
  id: Preprints.PreprintIdWithDoi,
): ((
  work: OpenAlex.Work,
) => Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsUnavailable,
  LanguageDetection.LanguageDetection
>) =>
  Effect.fnUntraced(function* (work) {
    if (work.type !== 'preprint') {
      return yield* new Preprints.NotAPreprint({ cause: work.type })
    }

    const authors = Array.map(work.authorships, ({ author, raw_author_name }) => ({
      name: Option.getOrElse(author.display_name, () => raw_author_name),
      ...Option.match(author.orcid, { onNone: () => ({}), onSome: orcid => ({ orcid }) }),
    }))

    if (!Array.isReadonlyArrayNonEmpty(authors)) {
      return yield* new Preprints.PreprintIsUnavailable({ cause: 'no authors' })
    }

    const workLanguage = Option.filter(work.language, Iso639.isIso6391)

    const titleText = sanitizeHtml(work.title, { allowBlockLevel: false })

    const titleLanguage = yield* Effect.catchTag(
      getLanguage(titleText, workLanguage),
      'UnableToDetectLanguage',
      error => new Preprints.PreprintIsUnavailable({ cause: error }),
    )

    const abstract = yield* Option.match(
      Option.filter(work.abstract_inverted_index, invertedIndex => !Record.isEmptyReadonlyRecord(invertedIndex)),
      {
        onNone: () => Effect.undefined,
        onSome: invertedIndex => {
          const text = sanitizeHtml(`<p>${encode(TextFromInvertedIndex(invertedIndex))}</p>`)

          return Effect.match(getLanguage(text, workLanguage), {
            onSuccess: language => ({ language, text }),
            onFailure: () => undefined,
          })
        },
      },
    )

    return Preprints.Preprint({
      abstract,
      authors,
      id,
      posted: work.publication_date,
      title: { language: titleLanguage, text: titleText },
      url: new URL(`https://doi.org/${id.value}`),
    })
  })

const getLanguage = (
  text: Html,
  workLanguage: Option.Option<LanguageCode>,
): Effect.Effect<LanguageCode, LanguageDetection.UnableToDetectLanguage, LanguageDetection.LanguageDetection> =>
  LanguageDetection.detectLanguage(text, Option.getOrUndefined(workLanguage))

const TextFromInvertedIndex: (invertedIndex: Record.ReadonlyRecord<string, ReadonlyArray<number>>) => string = flow(
  Record.toEntries,
  Array.flatMap(([word, positions]) => Array.map(positions, position => ({ position, word }))),
  Array.sortWith(Struct.get('position'), Number.Order),
  Array.map(Struct.get('word')),
  Array.join(' '),
)
