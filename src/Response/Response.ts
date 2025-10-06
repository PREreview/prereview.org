import { Array } from 'effect'
import type { Html } from '../html.ts'
import type { Page } from '../page.ts'
import * as StatusCodes from '../StatusCodes.ts'
import type { User } from '../user.ts'
import type { FlashMessageSchema } from './FlashMessage.ts'

export type Response =
  | PageResponse
  | StreamlinePageResponse
  | TwoUpPageResponse
  | RedirectResponse
  | FlashMessageResponse
  | LogInResponse

export interface PageResponse {
  readonly _tag: 'PageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: StatusCodes.StatusCode
  readonly title: Page['title']
  readonly description?: Page['description']
  readonly nav?: Html
  readonly main: Html
  readonly skipToLabel: 'form' | 'main' | 'prereview'
  readonly extraSkipLink?: [Html, string]
  readonly js: Required<Page>['js']
  readonly allowRobots?: false
}

export interface StreamlinePageResponse {
  readonly _tag: 'StreamlinePageResponse'
  readonly canonical?: string
  readonly current?: Page['current']
  readonly status: StatusCodes.StatusCode
  readonly title: Page['title']
  readonly description?: Page['description']
  readonly nav?: Html
  readonly main: Html
  readonly skipToLabel: 'form' | 'main'
  readonly js: Required<Page>['js']
  readonly allowRobots?: false
}

export interface TwoUpPageResponse {
  readonly _tag: 'TwoUpPageResponse'
  readonly canonical: string
  readonly title: Page['title']
  readonly description?: Page['description']
  readonly h1: Html
  readonly aside: Html
  readonly main: Html
  readonly type: 'preprint' | 'dataset'
}

export interface RedirectResponse {
  readonly _tag: 'RedirectResponse'
  readonly status: typeof StatusCodes.SeeOther | typeof StatusCodes.Found | typeof StatusCodes.MovedPermanently
  readonly location: URL | string
}

export interface FlashMessageResponse {
  readonly _tag: 'FlashMessageResponse'
  readonly location: string
  readonly message: typeof FlashMessageSchema.Type
}

export interface ForceLogInResponse {
  readonly _tag: 'ForceLogInResponse'
  readonly user: User
}

export interface LogInResponse {
  readonly _tag: 'LogInResponse'
  readonly location: string
}

export const PageResponse = (
  args: Optional<Omit<PageResponse, '_tag'>, 'status' | 'js' | 'skipToLabel'>,
): PageResponse => ({
  _tag: 'PageResponse',
  status: StatusCodes.OK,
  js: Array.empty(),
  skipToLabel: 'main',
  ...args,
})

export const StreamlinePageResponse = (
  args: Optional<Omit<StreamlinePageResponse, '_tag'>, 'status' | 'js' | 'skipToLabel'>,
): StreamlinePageResponse => ({
  _tag: 'StreamlinePageResponse',
  status: StatusCodes.OK,
  js: Array.empty(),
  skipToLabel: 'main',
  ...args,
})

export const TwoUpPageResponse = (args: Omit<TwoUpPageResponse, '_tag'>): TwoUpPageResponse => ({
  _tag: 'TwoUpPageResponse',
  ...args,
})

export const RedirectResponse = (
  args: Omit<RedirectResponse, '_tag' | 'status'> & Partial<Pick<RedirectResponse, 'status'>>,
): RedirectResponse => ({
  _tag: 'RedirectResponse',
  status: StatusCodes.SeeOther,
  ...args,
})

export const FlashMessageResponse = (args: Omit<FlashMessageResponse, '_tag'>): FlashMessageResponse => ({
  _tag: 'FlashMessageResponse',
  ...args,
})

export const LogInResponse = (args: Omit<LogInResponse, '_tag'>): LogInResponse => ({
  _tag: 'LogInResponse',
  ...args,
})

export const ForceLogInResponse = (args: Omit<ForceLogInResponse, '_tag'>): ForceLogInResponse => ({
  _tag: 'ForceLogInResponse',
  ...args,
})

// https://github.com/Microsoft/TypeScript/issues/25760#issuecomment-614417742
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
