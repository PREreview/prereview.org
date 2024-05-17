import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as Eq from 'fp-ts/Eq'
import * as RA from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'

export type Work = C.TypeOf<typeof WorkC>

const UrlC = C.make(
  pipe(
    D.string,
    D.parse(s =>
      E.tryCatch(
        () => new URL(s),
        () => D.error(s, 'URL'),
      ),
    ),
  ),
  { encode: url => url.href },
)

export const WorkC = C.struct({
  topics: C.array(
    C.struct({
      field: C.struct({ id: UrlC }),
    }),
  ),
})

export const getWorkByDoi: (doi: Doi) => TE.TaskEither<'unavailable', Work> = flow(
  doi =>
    TE.fromEither(
      match(doi.toLowerCase())
        .with('10.1101/2023.06.12.544578', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/13' } },
              { field: { id: 'https://openalex.org/fields/24' } },
              { field: { id: 'https://openalex.org/fields/24' } },
            ],
          }),
        )
        .with('10.1101/2024.04.19.590338', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/13' } },
              { field: { id: 'https://openalex.org/fields/24' } },
              { field: { id: 'https://openalex.org/fields/13' } },
            ],
          }),
        )
        .with('10.1101/2024.05.02.592279', () =>
          WorkC.decode({
            topics: [{ field: { id: 'https://openalex.org/fields/27' } }],
          }),
        )
        .with('10.1101/2024.05.05.592045', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/13' } },
              { field: { id: 'https://openalex.org/fields/13' } },
            ],
          }),
        )
        .with('10.1101/2024.05.06.592752', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/27' } },
              { field: { id: 'https://openalex.org/fields/28' } },
              { field: { id: 'https://openalex.org/fields/28' } },
            ],
          }),
        )
        .with('10.1101/2024.05.11.592705', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/22' } },
              { field: { id: 'https://openalex.org/fields/21' } },
              { field: { id: 'https://openalex.org/fields/22' } },
            ],
          }),
        )
        .with('10.1590/scielopreprints.5909', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/12' } },
              { field: { id: 'https://openalex.org/fields/12' } },
            ],
          }),
        )
        .with('10.1590/scielopreprints.7901', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/12' } },
              { field: { id: 'https://openalex.org/fields/12' } },
              { field: { id: 'https://openalex.org/fields/12' } },
            ],
          }),
        )
        .with('10.1590/scielopreprints.8479', () =>
          WorkC.decode({
            topics: [
              { field: { id: 'https://openalex.org/fields/36' } },
              { field: { id: 'https://openalex.org/fields/33' } },
            ],
          }),
        )
        .with('10.1590/scielopreprints.8828', () =>
          WorkC.decode({
            topics: [{ field: { id: 'https://openalex.org/fields/12' } }],
          }),
        )
        .otherwise(() => WorkC.decode({ topics: [] })),
    ),
  TE.mapLeft(() => 'unavailable' as const),
)

const eqUrl: Eq.Eq<URL> = pipe(
  s.Eq,
  Eq.contramap(url => url.href),
)

export const getFields: (work: Work) => ReadonlyArray<URL> = flow(
  work => work.topics,
  RA.map(topic => topic.field.id),
  RA.uniq(eqUrl),
)
