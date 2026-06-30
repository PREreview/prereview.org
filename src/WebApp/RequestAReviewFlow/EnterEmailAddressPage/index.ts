import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'

export const EnterEmailAddressPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale> = () => HavingProblemsPage

export const EnterEmailAddressSubmission: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale> = () => HavingProblemsPage
