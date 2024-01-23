import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { html, plainText } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../preprint'
import { type LogInResponse, type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import { writeReviewAddAuthorsMatch, writeReviewAuthorsMatch, writeReviewMatch } from '../routes'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { type FormStoreEnv, getForm, nextFormMatch } from './form'

export const writeReviewAddAuthors = ({
  id,
  method,
  user,
}: {
  id: IndeterminatePreprintId
  method: string
  user?: User
}): RT.ReaderTask<
  FormStoreEnv & GetPreprintTitleEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with('not-found', () => pageNotFound)
            .with('unavailable', () => havingProblemsPage)
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.bindW('form', ({ preprint, user }) => getForm(user.orcid, preprint.id)),
          RTE.matchW(
            error =>
              match(error)
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', () => havingProblemsPage)
                .exhaustive(),
            state =>
              match(state)
                .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, ({ form }) =>
                  RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
                )
                .with({ form: { moreAuthors: 'yes' } }, cannotAddAuthorsForm)
                .otherwise(() => pageNotFound),
          ),
        ),
    ),
  )

function cannotAddAuthorsForm({ preprint }: { preprint: PreprintTitle }) {
  return StreamlinePageResponse({
    title: plainText`Add more authors – PREreview of “${preprint.title}”`,
    nav: html`<a href="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
        <h1>Add more authors</h1>

        <p>Unfortunately, we’re unable to add more authors now.</p>

        <p>
          Please email us at <a href="mailto:help@prereview.org">help@prereview.org</a> to let us know their details,
          and we’ll add them on your behalf.
        </p>

        <p>We’ll remind you to do this once you have published your PREreview.</p>

        <button>Continue</button>
      </form>
    `,
    canonical: format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
  })
}
