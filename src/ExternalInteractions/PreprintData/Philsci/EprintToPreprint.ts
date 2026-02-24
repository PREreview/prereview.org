import { Url } from '@effect/platform'
import { Array, Either } from 'effect'
import type { Philsci } from '../../../ExternalApis/index.ts'
import { sanitizeHtml } from '../../../html.ts'
import * as Preprints from '../../../Preprints/index.ts'

export const EprintToPreprint = (eprint: Philsci.Eprint): Either.Either<Preprints.Preprint, Preprints.NotAPreprint> =>
  Either.gen(function* () {
    if (eprint.type !== 'pittpreprint') {
      yield* Either.left(new Preprints.NotAPreprint({ cause: { type: eprint.type } }))
    }

    return Preprints.Preprint({
      id: new Preprints.PhilsciPreprintId({ value: eprint.eprintid }),
      posted: eprint.date ?? eprint.datestamp.toPlainDate(),
      authors: Array.map(eprint.creators, author => ({
        name: `${author.name.given} ${author.name.family}`,
        orcid: author.orcid,
      })),
      title: {
        language: 'en' as const,
        text: sanitizeHtml(eprint.title, { allowBlockLevel: false }),
      },
      abstract:
        eprint.abstract !== undefined
          ? {
              language: 'en' as const,
              text: sanitizeHtml(`<p>${eprint.abstract}</p>`),
            }
          : undefined,
      url: Url.setProtocol(eprint.uri, 'https'),
    })
  })
