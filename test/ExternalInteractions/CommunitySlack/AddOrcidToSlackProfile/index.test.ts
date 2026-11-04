import { describe, expect, it, vi } from '../../../vitest.ts'
import { Effect, Layer, pipe } from 'effect'
import { Slack } from '../../../../src/ExternalApis/index.ts'
import { SlackError } from '../../../../src/ExternalApis/Slack/Types.ts'
import * as _ from '../../../../src/ExternalInteractions/CommunitySlack/AddOrcidToSlackProfile/index.ts'
import { layerShouldUpdateCommunitySlack } from '../../../../src/ExternalInteractions/CommunitySlack/ShouldUpdateCommunitySlack.ts'
import { toUrl } from '../../../../src/types/OrcidId.ts'
import * as fc from '../../../fc.ts'
import { shouldNotBeCalled } from '../../../should-not-be-called.ts'

describe('AddOrcidToSlackProfile', () => {
  describe('when Slack should be updated', () => {
    it.effect.prop('when the profile is updated', [fc.slackUserId(), fc.orcidId()], ([user, orcid]) =>
      Effect.gen(function* () {
        const usersProfileSet = vi.fn<(typeof Slack.Slack.Service)['usersProfileSet']>(() => Effect.void)
        const chatPostMessage = vi.fn<(typeof Slack.Slack.Service)['chatPostMessage']>(() =>
          Effect.succeed({ channel: Slack.ChannelId.make('C123'), ts: Slack.Timestamp.make('123') }),
        )

        yield* pipe(
          _.AddOrcidToSlackProfile(user, orcid),
          Effect.provide([
            Layer.mock(Slack.Slack, { usersProfileSet, chatPostMessage }),
            layerShouldUpdateCommunitySlack(true),
          ]),
        )

        expect(usersProfileSet).toHaveBeenCalledExactlyOnceWith(
          { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
          user.accessToken,
        )
        expect(chatPostMessage).toHaveBeenCalledExactlyOnceWith({
          channel: user.userId,
          blocks: [
            {
              type: 'markdown',
              text: 'Thanks for connecting your PREreview profile to your Community Slack Account. I’ve added your ORCID iD to your Slack profile.',
            },
          ],
        })
      }),
    )

    it.effect.prop(
      "when the profile can't be updated",
      [fc.slackUserId(), fc.orcidId(), fc.string()],
      ([user, orcid, message]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(
            _.AddOrcidToSlackProfile(user, orcid),
            Effect.provide([
              Layer.mock(Slack.Slack, {
                usersProfileSet: () => new SlackError({ message }),
                chatPostMessage: shouldNotBeCalled,
              }),
              layerShouldUpdateCommunitySlack(true),
            ]),
            Effect.flip,
          )

          expect(actual).toStrictEqual(new _.FailedToAddOrcidToSlackProfile({ cause: new SlackError({ message }) }))
        }),
    )

    it.effect.prop(
      "when the user can't be messaged",
      [fc.slackUserId(), fc.orcidId(), fc.string()],
      ([user, orcid, message]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(
            _.AddOrcidToSlackProfile(user, orcid),
            Effect.provide([
              Layer.mock(Slack.Slack, {
                usersProfileSet: () => Effect.void,
                chatPostMessage: () => new SlackError({ message }),
              }),
              layerShouldUpdateCommunitySlack(true),
            ]),
            Effect.flip,
          )

          expect(actual).toStrictEqual(new _.FailedToAddOrcidToSlackProfile({ cause: new SlackError({ message }) }))
        }),
    )
  })

  it.effect.prop("when Slack shouldn't be updated", [fc.slackUserId(), fc.orcidId()], ([user, orcid]) =>
    pipe(
      _.AddOrcidToSlackProfile(user, orcid),
      Effect.provide([
        Layer.mock(Slack.Slack, { usersProfileSet: shouldNotBeCalled, chatPostMessage: shouldNotBeCalled }),
        layerShouldUpdateCommunitySlack(false),
      ]),
    ),
  )
})
