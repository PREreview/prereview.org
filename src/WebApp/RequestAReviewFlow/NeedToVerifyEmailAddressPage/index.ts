import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'

export const NeedToVerifyEmailAddressPage: ({
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}) => Effect.Effect<Response, never, Locale> = () => HavingProblemsPage
