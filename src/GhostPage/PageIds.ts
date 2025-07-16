import { Effect, pipe, type Record } from 'effect'
import { Locale } from '../Context.js'
import type { SupportedLocale } from '../locales/index.js'

export type PageId = keyof typeof pageIds

export const getGhostIdAndLocaleForPage = (
  page: PageId,
): Effect.Effect<{ id: string; locale: SupportedLocale }, never, Locale> =>
  pipe(
    Effect.Do,
    Effect.bind('locale', () => Effect.andThen(Locale, locale => (locale in pageIds[page] ? locale : 'en-US'))),
    Effect.let('id', ({ locale }) => pageIds[page][locale as never]),
  )

const pageIds = {
  AboutUs: {
    'en-US': '6154aa157741400e8722bb14',
    'pt-BR': '68753c7207fb34a92c7fb259',
  },
  Clubs: {
    'en-US': '64637b4c07fb34a92c7f84ec',
  },
  CodeOfConduct: {
    'en-US': '6154aa157741400e8722bb00',
  },
  EdiaStatement: {
    'en-US': '6154aa157741400e8722bb17',
  },
  Funding: {
    'en-US': '6154aa157741400e8722bb12',
  },
  HowToUse: {
    'en-US': '651d895e07fb34a92c7f8d28',
  },
  LiveReviews: {
    'en-US': '6154aa157741400e8722bb10',
  },
  People: {
    'en-US': '6154aa157741400e8722bb0a',
  },
  PrivacyPolicy: {
    'en-US': '6154aa157741400e8722bb0f',
  },
  Resources: {
    'en-US': '6526c6ae07fb34a92c7f8d6f',
  },
  Trainings: {
    'en-US': '64639b5007fb34a92c7f8518',
  },
} satisfies Record.ReadonlyRecord<string, Partial<Record.ReadonlyRecord<SupportedLocale, string>>>
