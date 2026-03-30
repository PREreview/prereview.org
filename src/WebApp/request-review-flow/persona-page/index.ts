import { Option, Struct, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { P, match } from 'ts-pattern'
import { missingE } from '../../../form.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { requestReviewCheckMatch } from '../../../routes.ts'
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
  preprint,
  user,
  locale,
}: {
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv & EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestQueries>,
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
      flow(({ user, preprint }) =>
        EffectToFpts.toReaderTaskEither(
          ReviewRequests.getPersonaChoice({ requesterId: user.orcid, preprintId: preprint }),
        ),
      ),
    ),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'ReviewRequestHasBeenPublished' }, () =>
              RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprint }) }),
            )
            .with('no-session', () =>
              LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
            )
            .with({ _tag: P.union('PreprintIsNotFound', 'UnknownReviewRequest') }, () => pageNotFound(locale))
            .with({ _tag: P.union('PreprintIsUnavailable', 'UnableToQuery') }, 'unavailable', () =>
              havingProblemsPage(locale),
            )
            .exhaustive(),
        ),
      ({ preprint, reviewRequest, user, locale }) =>
        RT.of(
          personaForm({
            form: { persona: E.right(Option.getOrUndefined(reviewRequest.personaChoice)) },
            preprint,
            user,
            locale,
          }),
        ),
    ),
  )

export const requestReviewPersonaSubmission = ({
  body,
  preprint,
  user,
  locale,
}: {
  body: unknown
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv &
    EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>,
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
      flow(({ user, preprint }) =>
        EffectToFpts.toReaderTaskEither(
          ReviewRequests.getPersonaChoice({ requesterId: user.orcid, preprintId: preprint }),
        ),
      ),
    ),
    RTE.let('body', () => body),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'ReviewRequestHasBeenPublished' }, () =>
              RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprint }) }),
            )
            .with('no-session', () =>
              LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
            )
            .with({ _tag: P.union('PreprintIsNotFound', 'UnknownReviewRequest') }, () => pageNotFound(locale))
            .with({ _tag: P.union('PreprintIsUnavailable', 'UnableToQuery') }, 'unavailable', () =>
              havingProblemsPage(locale),
            )
            .exhaustive(),
        ),
      ({ preprint, reviewRequest, user, locale, body }) =>
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
          RTE.chainFirstW(fields =>
            EffectToFpts.toReaderTaskEither(
              ReviewRequests.choosePersona({ persona: fields.persona, reviewRequestId: reviewRequest.reviewRequestId }),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('unavailable', () => havingProblemsPage(locale))
                .with(
                  { _tag: P.union('UnknownReviewRequest', 'ReviewRequestHasBeenPublished', 'UnableToHandleCommand') },
                  () => havingProblemsPage(locale),
                )
                .with({ persona: P.any }, form => personaForm({ form, preprint, user, locale }))
                .exhaustive(),
            () => RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: preprint }) }),
          ),
        ),
    ),
  )

const PersonaFieldD = pipe(
  D.struct({
    persona: D.literal('public', 'pseudonym'),
  }),
  D.map(Struct.get('persona')),
)
