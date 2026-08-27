import { Effect, pipe, type Record } from 'effect'
import { Locale } from '../../Context.ts'
import type { SupportedLocale } from '../../locales/index.ts'

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
    'es-419': '687f7b7307fb34a92c7fb2cf',
    'fr-002': '6a8c4c6207fb34a92c7fce8a',
    'pt-BR': '68753c7207fb34a92c7fb259',
  },
  ChampionsProgram: {
    'en-US': '6941ac7207fb34a92c7fbbae',
    'es-419': '6978ccbe07fb34a92c7fbe36',
    'pt-BR': '6978cb2c07fb34a92c7fbdf7',
  },
  Clubs: {
    'en-US': '64637b4c07fb34a92c7f84ec',
    'es-419': '6881011607fb34a92c7fb34c',
    'fr-002': '6a8c491807fb34a92c7fce2e',
    'pt-BR': '68753ced07fb34a92c7fb266',
  },
  CodeOfConduct: {
    'en-US': '6154aa157741400e8722bb00',
    'es-419': '687f7c3e07fb34a92c7fb2eb',
    'fr-002': '6a8c4d8c07fb34a92c7fceb3',
    'pt-BR': '68753d1a07fb34a92c7fb26e',
  },
  EdiaStatement: {
    'en-US': '6154aa157741400e8722bb17',
    'es-419': '68b6dea907fb34a92c7fb426',
    'fr-002': '6a8c539807fb34a92c7fced4',
    'pt-BR': '68adc69607fb34a92c7fb409',
  },
  Funding: {
    'en-US': '6154aa157741400e8722bb12',
    'es-419': '68835c7007fb34a92c7fb382',
    'fr-002': '6a8c4c1707fb34a92c7fce7d',
    'pt-BR': '68753e3d07fb34a92c7fb284',
  },
  HowToUse: {
    'en-US': '651d895e07fb34a92c7f8d28',
    'es-419': '68adc7e307fb34a92c7fb418',
    'fr-002': '6a8c4a8b07fb34a92c7fce4b',
    'pt-BR': '68753dc807fb34a92c7fb27a',
  },
  LiveReviews: {
    'en-US': '6154aa157741400e8722bb10',
    'es-419': '687f7c0a07fb34a92c7fb2e2',
    'fr-002': '6a8c4cb307fb34a92c7fce95',
    'pt-BR': '68753e9e07fb34a92c7fb28e',
  },
  People: {
    'en-US': '6154aa157741400e8722bb0a',
    'es-419': '68835d1e07fb34a92c7fb394',
    'fr-002': '6a8c540507fb34a92c7fcee7',
    'pt-BR': '68ac5bb407fb34a92c7fb3dd',
  },
  PrivacyPolicy: {
    'en-US': '6154aa157741400e8722bb0f',
    'es-419': '6881015b07fb34a92c7fb355',
    'fr-002': '6a8c4bd307fb34a92c7fce71',
    'pt-BR': '68753ee307fb34a92c7fb298',
  },
  Resources: {
    'en-US': '6526c6ae07fb34a92c7f8d6f',
    'es-419': '68835c4407fb34a92c7fb379',
    'fr-002': '6a8c4b8d07fb34a92c7fce67',
    'pt-BR': '68753f1607fb34a92c7fb2a4',
  },
  Trainings: {
    'en-US': '64639b5007fb34a92c7f8518',
    'es-419': '687f7bb307fb34a92c7fb2d9',
    'fr-002': '6a8c4d1107fb34a92c7fcea3',
    'pt-BR': '68753f3e07fb34a92c7fb2ac',
  },
} satisfies Record.ReadonlyRecord<string, Partial<Record.ReadonlyRecord<SupportedLocale, string>>>
