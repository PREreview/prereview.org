import { Array, Context, Effect, Layer, pipe, Schema, Scope, String, Struct } from 'effect'
import { Clubs } from '../../Clubs/index.ts'
import { Locale } from '../../Context.ts'
import { html, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import * as Routes from '../../routes.ts'

export const DynamicEmbed = Schema.transformLiterals(
  ['list-of-active-clubs', 'listOfActiveClubs'],
  ['list-of-inactive-clubs', 'listOfInactiveClubs'],
)

export class DynamicEmbedder extends Context.Tag('DynamicEmbedder')<
  DynamicEmbedder,
  Record<typeof DynamicEmbed.Type, Effect.Effect<Html, never, Locale>>
>() {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const context = yield* Effect.andThen(Effect.context<Clubs>(), Context.omit(Scope.Scope))

      return {
        listOfActiveClubs: Effect.provide(ListOfActiveClubs, context),
        listOfInactiveClubs: Effect.provide(ListOfInactiveClubs, context),
      }
    }),
  )
}

export const ListOfActiveClubs = Effect.gen(function* () {
  const locale = yield* Locale
  const clubs = yield* Clubs

  const allClubs = yield* clubs.listClubs

  return html`
    <ul>
      ${pipe(
        Array.filter(allClubs, club => club.status === 'active'),
        Array.sortWith(Struct.get('name'), (a, b) => String.localeCompare(b, locale, { sensitivity: 'base' })(a)),
        Array.map(club => {
          return html`
            <li>
              <a href="${Routes.ClubProfile.href({ slug: club.slug })}" ${languageAttributesFor(club.language)}
                >${club.name}</a
              >
            </li>
          `
        }),
      )}
    </ul>
  `
})

export const ListOfInactiveClubs = Effect.gen(function* () {
  const locale = yield* Locale
  const clubs = yield* Clubs

  const allClubs = yield* clubs.listClubs

  return html`
    <ul>
      ${pipe(
        Array.filter(allClubs, club => club.status === 'inactive'),
        Array.sortWith(Struct.get('name'), (a, b) => String.localeCompare(b, locale, { sensitivity: 'base' })(a)),
        Array.map(club => {
          return html`
            <li>
              <a href="${Routes.ClubProfile.href({ slug: club.slug })}" ${languageAttributesFor(club.language)}
                >${club.name}</a
              >
            </li>
          `
        }),
      )}
    </ul>
  `
})
