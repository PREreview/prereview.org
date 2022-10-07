import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { canAddAuthors } from '../feature-flags'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import {
  writeReviewAddAuthorMatch,
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
} from '../routes'
import { NonEmptyStringC } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAddAuthor = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'canAddAuthors',
        fromReaderK(({ user }) => canAddAuthors(user)),
      ),
      RM.filterOrElseW(
        ({ canAddAuthors }) => canAddAuthors,
        () => 'not-found',
      ),
      RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
      RM.apSW('method', RM.decodeMethod(E.right)),
      RM.ichainW(state =>
        match(state)
          .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleAddAuthorForm)
          .with({ form: { moreAuthors: 'yes' } }, showAddAuthorForm)
          .otherwise(() => notFound),
      ),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => notFound)
          .otherwise(() => RM.fromMiddleware(seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi })))),
      ),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const showAddAuthorForm = flow(
  fromReaderK(({ preprint, user }: { preprint: Preprint; user: User }) => addAuthorForm(preprint, {}, user)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAddAuthorErrorForm = flow(
  fromReaderK((preprint: Preprint, user: User) => addAuthorForm(preprint, {}, user, true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const handleAddAuthorForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(AddAuthorFormD.decode),
    RM.map(({ name }) => ({ otherAuthors: [...(form.otherAuthors ?? []), name] })),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(() => seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi }))),
    RM.orElseW(() => showAddAuthorErrorForm(preprint, user)),
  )

type AddAuthorForm = D.TypeOf<typeof AddAuthorFormD>

const AddAuthorFormD = D.struct({
  name: NonEmptyStringC,
})

function addAuthorForm(preprint: Preprint, form: Partial<AddAuthorForm>, user: User, error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}Add an author – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form method="post" action="${format(writeReviewAddAuthorMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    <li>
                      <a href="#add-author-name">Enter their name</a>
                    </li>
                  </ul>
                </error-summary>
              `
            : ''}

          <h1>Add an author</h1>

          <div ${rawHtml(error ? 'class="error"' : '')}>
            <label for="add-author-name">Name</label>

            ${error
              ? html`
                  <div class="error-message" id="add-author-name-error">
                    <span class="visually-hidden">Error:</span> Enter their name
                  </div>
                `
              : ''}

            <input
              id="add-author-name"
              name="name"
              type="text"
              spellcheck="false"
              ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="add-author-name-error"' : '')}
            />
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
