import { Fixtures, PlaywrightTestArgs, PlaywrightTestOptions, test as baseTest } from '@playwright/test'
import { SystemClock } from 'clock-ts'
import fetchMock, { FetchMockSandbox } from 'fetch-mock'
import * as IO from 'fp-ts/IO'
import { Server } from 'http'
import { app } from '../src/app'

export { expect } from '@playwright/test'

type AppFixtures = {
  fetch: FetchMockSandbox
  server: Server
}

const appFixtures: Fixtures<AppFixtures, Record<never, never>, PlaywrightTestArgs & PlaywrightTestOptions> = {
  baseURL: async ({ server }, use) => {
    const address = server.address()

    if (typeof address !== 'object' || address === null) {
      throw new Error('Unable to find a port')
    }

    await use(`http://localhost:${address.port}`)
  },
  fetch: async ({}, use) => {
    await use(fetchMock.sandbox())
  },
  server: async ({ fetch }, use) => {
    const server = app({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
      zenodoApiKey: '',
      zenodoUrl: new URL('http://zenodo.test/'),
    })

    server.listen()

    await use(server)

    server.close()
  },
}

export const test = baseTest.extend(appFixtures)
