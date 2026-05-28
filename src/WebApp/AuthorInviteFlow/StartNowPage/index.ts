import { Effect } from 'effect'
import { renderStartNowPage } from './StartNowPage.ts'

export const StartNowPage = () => Effect.sync(renderStartNowPage)
