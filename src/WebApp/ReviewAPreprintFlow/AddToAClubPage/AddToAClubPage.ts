import { Array, Either, Match, pipe, String, Struct } from 'effect'
import { getClubName, type ClubId } from '../../../Clubs/index.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as AddToAClubForm from './AddToAClubForm.ts'

export const renderAddToAClubPage = ({
  clubs,
  form,
  locale,
  preprint,
}: {
  clubs: Array.NonEmptyReadonlyArray<ClubId>
  form: AddToAClubForm.AddToAClubForm
  locale: SupportedLocale
  preprint: PreprintTitle
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe('Add this review to your club', errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form method="post" action="${Routes.ReviewAPreprintAddToAClub.href({ preprintId: preprint.id })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale, clubs), errorSummary(locale)) : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.addToClub)
                ? 'aria-invalid="true" aria-errormessage="add-to-club-error"'
                : '',
            )}
          >
            <legend>
              <h1><span lang="en" dir="ltr">Add this review to your club</span></h1>
            </legend>

            ${
              form._tag === 'InvalidForm' && Either.isLeft(form.addToClub)
                ? html`
                    <div class="error-message" id="add-to-club-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.addToClub.left, {
                        Missing: () => html`<span lang="en" dir="ltr">Select a club for the review</span>`,
                      })}
                    </div>
                  `
                : ''
            }

            <ol>
              ${pipe(
                Array.map(clubs, clubId => ({ clubId, ...getClubName(clubId) })),
                Array.sortWith(Struct.get('text'), (a, b) =>
                  String.localeCompare(b, locale, { sensitivity: 'base' })(a),
                ),
                Array.map(
                  club => html`
                    <li>
                      <label>
                        <input
                          name="addToClub"
                          id="add-to-club-${club.clubId}"
                          type="radio"
                          value="${club.clubId}"
                          ${pipe(
                            Match.value(form),
                            Match.when(
                              { _tag: 'CompletedForm', addToClub: clubId => clubId === club.clubId },
                              () => 'checked',
                            ),
                            Match.orElse(() => ''),
                          )}
                        />
                        <span ${languageAttributesFor(club.language)}>${club.text}</span>
                      </label>
                    </li>
                  `,
                ),
              )}
              <li>
                ${t('forms', 'radioSeparatorLabel')()}
                <label>
                  <input
                    name="addToClub"
                    type="radio"
                    value="not-a-club-review"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        { _tag: 'CompletedForm', addToClub: club => club === 'not-a-club-review' },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span lang="en" dir="ltr">This isn’t a club review</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewAPreprintAddToAClub.href({ preprintId: preprint.id }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

const toErrorItems =
  (locale: SupportedLocale, clubs: Array.NonEmptyReadonlyArray<ClubId>) => (form: AddToAClubForm.InvalidForm) => html`
    ${
      Either.isLeft(form.addToClub)
        ? html`
            <li>
              <a
                href="#add-to-club-${pipe(
                  Array.map(clubs, clubId => ({ clubId, ...getClubName(clubId) })),
                  Array.sortWith(Struct.get('text'), (a, b) =>
                    String.localeCompare(b, locale, { sensitivity: 'base' })(a),
                  ),
                  Array.headNonEmpty,
                  Struct.get('clubId'),
                )}"
              >
                ${Match.valueTags(form.addToClub.left, {
                  Missing: () => html`<span lang="en" dir="ltr">Select a club for the review</span>`,
                })}
              </a>
            </li>
          `
        : ''
    }
  `
