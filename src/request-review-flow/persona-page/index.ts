import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { missingE } from '../../form.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../preprint.js'
import { LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import {
  type GetReviewRequestEnv,
  type IncompleteReviewRequest,
  type ReviewRequestPreprintId,
  type SaveReviewRequestEnv,
  getReviewRequest,
  isReviewRequestPreprintId,
  saveReviewRequest,
} from '../../review-request.js'
import { requestReviewCheckMatch, requestReviewMatch, requestReviewPublishedMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { personaForm } from './persona-form.js'

export const requestReviewPersona = ({
  body,
  method,
  preprint,
  user,
}: {
  body: unknown
  method: string
  preprint: IndeterminatePreprintId
  user?: User
}): RT.ReaderTask<
  GetPreprintTitleEnv & GetReviewRequestEnv & SaveReviewRequestEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.bindW('preprint', () =>
      pipe(
        getPreprintTitle(preprint),
        RTE.map(preprint => preprint.id),
        RTE.filterOrElseW(isReviewRequestPreprintId, () => 'not-found' as const),
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
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      state =>
        match(state)
          .with({ method: 'POST' }, handlePersonaForm)
          .with({ method: P.string }, ({ preprint, reviewRequest, user }) =>
            RT.of(personaForm({ form: { persona: E.right(reviewRequest.persona) }, preprint, user })),
          )
          .exhaustive(),
    ),
  )

const handlePersonaForm = ({
  body,
  reviewRequest,
  preprint,
  user,
}: {
  body: unknown
  reviewRequest: IncompleteReviewRequest
  preprint: ReviewRequestPreprintId
  user: User
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
    RTE.matchW(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage)
          .with({ persona: P.any }, form => personaForm({ form, preprint, user }))
          .exhaustive(),
      () => RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: preprint }) }),
    ),
  )

const PersonaFieldD = pipe(
  D.struct({
    persona: D.literal('public', 'pseudonym'),
  }),
  D.map(get('persona')),
)
