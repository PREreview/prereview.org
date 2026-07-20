import { Array, Either, Match, pipe, String, Struct } from 'effect'
import type { ClubName } from '../../../Clubs/index.ts'
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
  clubs: Array.NonEmptyReadonlyArray<ClubName>
  form: AddToAClubForm.AddToAClubForm
  locale: SupportedLocale
  preprint: PreprintTitle
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('isClubReview')(), errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form method="post" action="${Routes.ReviewAPreprintAddToAClub.href({ preprintId: preprint.id })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale, clubs), errorSummary(locale)) : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            aria-describedby="add-to-club-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.addToClub)
                ? 'aria-invalid="true" aria-errormessage="add-to-club-error"'
                : '',
            )}
          >
            <legend>
              <h1>${t('isClubReview')()}</h1>
            </legend>

            <p id="add-to-club-tip" role="note">${t('asLeadCanAddToClub')({ numberOfClubs: clubs.length })}</p>

            ${
              form._tag === 'InvalidForm' && Either.isLeft(form.addToClub)
                ? html`
                    <div class="error-message" id="add-to-club-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.addToClub.left, {
                        Missing: () => t('isClubReviewError')(),
                      })}
                    </div>
                  `
                : ''
            }

            <ol>
              ${pipe(
                Array.sortWith(clubs, Struct.get('name'), (a, b) =>
                  String.localeCompare(b, locale, { sensitivity: 'base' })(a),
                ),
                Array.map(
                  club => html`
                    <li>
                      <label>
                        <input
                          name="addToClub"
                          id="add-to-club-${club.id}"
                          type="radio"
                          value="${club.id}"
                          ${pipe(
                            Match.value(form),
                            Match.when(
                              { _tag: 'CompletedForm', addToClub: clubId => clubId === club.id },
                              () => 'checked',
                            ),
                            Match.orElse(() => ''),
                          )}
                        />
                        ${t('addToClub')({ clubName: html`<span ${languageAttributesFor(club.language)}>${club.name}</span>` })}
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
                  ${t('notClubReview')()}
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
  (locale: SupportedLocale, clubs: Array.NonEmptyReadonlyArray<ClubName>) => (form: AddToAClubForm.InvalidForm) => html`
    ${
      Either.isLeft(form.addToClub)
        ? html`
            <li>
              <a
                href="#add-to-club-${pipe(
                  Array.sortWith(clubs, Struct.get('name'), (a, b) =>
                    String.localeCompare(b, locale, { sensitivity: 'base' })(a),
                  ),
                  Array.headNonEmpty,
                  Struct.get('id'),
                )}"
              >
                ${Match.valueTags(form.addToClub.left, {
                  Missing: () => translate(locale, 'write-review', 'isClubReviewError')(),
                })}
              </a>
            </li>
          `
        : ''
    }
  `
