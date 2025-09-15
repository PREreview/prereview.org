import { Url } from '@effect/platform'
import { Array, Either } from 'effect'
import { sanitizeHtml } from '../../html.js'
import type * as Philsci from '../../Philsci/index.js'
import * as Preprint from '../../preprint.js'
import { PhilsciPreprintId } from '../../types/preprint-id.js'

export const EprintToPreprint = (eprint: Philsci.Eprint): Either.Either<Preprint.Preprint, Preprint.NotAPreprint> =>
  Either.gen(function* () {
    if (eprint.type !== 'pittpreprint') {
      yield* Either.left(new Preprint.NotAPreprint({ cause: { type: eprint.type } }))
    }

    return Preprint.Preprint({
      id: new PhilsciPreprintId({ value: eprint.eprintid }),
      posted: eprint.date ?? eprint.datestamp.toPlainDate(),
      authors: Array.map(eprint.creators, author => ({
        name: `${author.name.given} ${author.name.family}`,
        orcid: author.orcid,
      })),
      title: {
        language: 'en' as const,
        text: sanitizeHtml(eprint.title),
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
