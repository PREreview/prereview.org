import { Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { missingE } from '../../../form.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId, PreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import {
  type GetReviewRequestEnv,
  type IncompleteReviewRequest,
  type SaveReviewRequestEnv,
  getReviewRequest,
  saveReviewRequest,
} from '../../../review-request.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import { requestReviewCheckMatch, requestReviewMatch, requestReviewPublishedMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import {
  LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import { personaForm } from './persona-form.ts'

export const requestReviewPersona = ({
  body,
  method,
  preprint,
  user,
  locale,
}: {
  body: unknown
  method: string
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv &
    GetReviewRequestEnv &
    SaveReviewRequestEnv &
    EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestCommands>,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
    RTE.bindW('preprint', () =>
      pipe(
        getPreprintTitle(preprint),
        RTE.map(preprint => preprint.id),
      ),
    ),
    RTE.bindW(
      'reviewRequest',
      flow(
        ({ user, preprint }) => getReviewRequest(user.orcid, preprint),
        RTE.chainW(request =>
          match(request)
            .with({ status: 'completed' }, () => RTE.left('already-completed' as const))
            .with({ status: 'incomplete' }, RTE.right)
            .exhaustive(),
        ),
      ),
    ),
    RTE.let('method', () => method),
    RTE.let('body', () => body),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with('already-completed', () =>
              RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, { id: preprint }) }),
            )
            .with('no-session', () =>
              LogInResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }),
            )
            .with({ _tag: 'PreprintIsNotFound' }, 'not-found', () => pageNotFound(locale))
            .with({ _tag: 'PreprintIsUnavailable' }, 'unavailable', () => havingProblemsPage(locale))
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handlePersonaForm)
          .with({ method: P.string }, ({ preprint, reviewRequest, user, locale }) =>
            RT.of(personaForm({ form: { persona: E.right(reviewRequest.persona) }, preprint, user, locale })),
          )
          .exhaustive(),
    ),
  )

const handlePersonaForm = ({
  body,
  reviewRequest,
  preprint,
  user,
  locale,
}: {
  body: unknown
  reviewRequest: IncompleteReviewRequest
  preprint: PreprintId
  user: User
  locale: SupportedLocale
}) =>
  pipe(
    RTE.Do,
    RTE.let('persona', () => pipe(PersonaFieldD.decode(body), E.mapLeft(missingE))),
    RTE.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('persona', fields.persona),
        E.mapLeft(() => fields),
      ),
    ),
    RTE.chainFirstW(fields => saveReviewRequest(user.orcid, preprint, { ...reviewRequest, persona: fields.persona })),
    RTE.chainFirstW(fields =>
      EffectToFpts.toReaderTaskEither(
        ReviewRequests.choosePersona({ persona: fields.persona, reviewRequestId: reviewRequest.id }),
      ),
    ),
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage(locale))
          .with({ _tag: P.union('UnknownReviewRequest', 'UnableToHandleCommand') }, () => havingProblemsPage(locale))
          .with({ persona: P.any }, form => personaForm({ form, preprint, user, locale }))
          .exhaustive(),
      () => RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: preprint }) }),
    ),
  )

const PersonaFieldD = pipe(
  D.struct({
    persona: D.literal('public', 'pseudonym'),
  }),
  D.map(Struct.get('persona')),
)
