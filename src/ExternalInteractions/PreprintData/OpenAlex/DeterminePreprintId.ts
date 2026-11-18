import { Effect, Match, Option, pipe, String, Struct } from 'effect'
import * as Preprints from '../../../Domain/Preprints/index.ts'
import type { OpenAlex } from '../../../ExternalApis/index.ts'

export const determinePreprintId = (
  id: Preprints.IndeterminatePreprintIdWithDoi,
  work: OpenAlex.Work,
): Effect.Effect<Preprints.PreprintIdWithDoi, Preprints.PreprintIsUnavailable> =>
  pipe(
    Match.value(id),
    Match.tag('BiorxivOrMedrxivPreprintId', id => {
      const source = Option.map(Option.flatMap(work.primary_location, Struct.get('source')), Struct.get('display_name'))

      if (Option.exists(source, String.startsWith('bioRxiv'))) {
        return Effect.succeed(new Preprints.BiorxivPreprintId({ value: id.value }))
      }

      if (Option.exists(source, String.startsWith('medRxiv'))) {
        return Effect.succeed(new Preprints.MedrxivPreprintId({ value: id.value }))
      }

      return Effect.fail(new Preprints.PreprintIsUnavailable({ cause: { source } }))
    }),
    Match.tag('OsfOrLifecycleJournalPreprintId', id =>
      Effect.succeed(new Preprints.OsfPreprintId({ value: id.value })),
    ),
    Match.tag('ZenodoOrAfricarxivPreprintId', id =>
      Effect.succeed(new Preprints.ZenodoPreprintId({ value: id.value })),
    ),
    Match.orElse(id => Effect.succeed(id)),
  )
