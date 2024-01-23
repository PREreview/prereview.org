import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type CanInviteAuthorsEnv, canInviteAuthors } from '../feature-flags'
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml } from '../html'
import { havingProblemsPage, pageNotFound } from '../http-error'
import { type GetPreprintTitleEnv, type PreprintTitle, getPreprintTitle } from '../preprint'
import { type LogInResponse, type PageResponse, RedirectResponse, StreamlinePageResponse } from '../response'
import {
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
} from '../routes'
import type { IndeterminatePreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { type Form, type FormStoreEnv, getForm, nextFormMatch } from './form'

export const writeReviewAddAuthors = ({
  body,
  id,
  method,
  user,
}: {
  body: unknown
  id: IndeterminatePreprintId
  method: string
  user?: User
}): RT.ReaderTask<
  CanInviteAuthorsEnv & FormStoreEnv & GetPreprintTitleEnv,
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
          RTE.let('body', () => body),
          RTE.bindW('form', ({ preprint, user }) => getForm(user.orcid, preprint.id)),
          RTE.bindW('canInviteAuthors', ({ user }) => RTE.fromReader(canInviteAuthors(user))),
          RTE.let('authors', ({ form }) => form.otherAuthors ?? []),
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
                .with({ canInviteAuthors: false, form: { moreAuthors: 'yes' }, method: 'POST' }, ({ form }) =>
                  RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
                )
                .with({ canInviteAuthors: false, form: { moreAuthors: 'yes' } }, cannotAddAuthorsForm)
                .with({ canInviteAuthors: true, form: { moreAuthors: 'yes' }, authors: P.when(RA.isEmpty) }, () =>
                  RedirectResponse({ location: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }) }),
                )
                .with({ canInviteAuthors: true, form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorsForm)
                .with({ canInviteAuthors: true, form: { moreAuthors: 'yes' } }, state =>
                  addAuthorsForm({ ...state, form: { anotherAuthor: E.right(undefined) } }),
                )
                .otherwise(() => pageNotFound),
          ),
        ),
    ),
  )

const handleAddAuthorsForm = ({ body, form, preprint }: { body: unknown; form: Form; preprint: PreprintTitle }) =>
  pipe(
    E.Do,
    E.let('anotherAuthor', () => pipe(AnotherAuthorFieldD.decode(body), E.mapLeft(missingE))),
    E.chain(fields =>
      pipe(
        E.Do,
        E.apS('anotherAuthor', fields.anotherAuthor),
        E.mapLeft(() => fields),
      ),
    ),
    E.matchW(
      error => addAuthorsForm({ form: error, preprint }),
      state =>
        match(state)
          .with({ anotherAuthor: 'yes' }, () =>
            RedirectResponse({ location: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }) }),
          )
          .with({ anotherAuthor: 'no' }, () =>
            RedirectResponse({ location: format(nextFormMatch(form).formatter, { id: preprint.id }) }),
          )
          .exhaustive(),
    ),
  )

const AnotherAuthorFieldD = pipe(
  D.struct({
    anotherAuthor: D.literal('yes', 'no'),
  }),
  D.map(get('anotherAuthor')),
)

interface AddAuthorsForm {
  readonly anotherAuthor: E.Either<MissingE, 'yes' | 'no' | undefined>
}

function addAuthorsForm({ form, preprint }: { form: AddAuthorsForm; preprint: PreprintTitle }) {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Do you need to add another author? – PREreview of “${preprint.title}”`,
    nav: html`<a href="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.anotherAuthor)
                    ? html`
                        <li>
                          <a href="#another-author-no">
                            ${match(form.anotherAuthor.left)
                              .with({ _tag: 'MissingE' }, () => 'Select yes if you need to add another author')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.anotherAuthor) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(
              E.isLeft(form.anotherAuthor) ? 'aria-invalid="true" aria-errormessage="another-author-error"' : '',
            )}
          >
            <legend><h1>Do you need to add another author?</h1></legend>

            ${E.isLeft(form.anotherAuthor)
              ? html`
                  <div class="error-message" id="another-author-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.anotherAuthor.left)
                      .with({ _tag: 'MissingE' }, () => 'Select yes if you need to add another author')
                      .exhaustive()}
                  </div>
                `
              : ''}
            <ol>
              <li>
                <label>
                  <input
                    name="anotherAuthor"
                    id="another-author-no"
                    type="radio"
                    value="no"
                    ${match(form.anotherAuthor)
                      .with({ right: 'no' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>No</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="anotherAuthor"
                    id="another-author-yes"
                    type="radio"
                    value="yes"
                    ${match(form.anotherAuthor)
                      .with({ right: 'yes' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Yes</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Continue</button>
      </form>
    `,
    canonical: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: ['error-summary.js'],
  })
}

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
