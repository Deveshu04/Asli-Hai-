import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useVideoConfig } from "remotion";
import { End, END_FRAMES } from "./scenes/End";
import { Hook, HOOK_FRAMES } from "./scenes/Hook";
import { MadeForHer, MADE_FOR_HER_FRAMES } from "./scenes/MadeForHer";
import { OtherPaths, OTHER_PATHS_FRAMES } from "./scenes/OtherPaths";
import { Press, PRESS_FRAMES } from "./scenes/Press";
import { Trust, TRUST_FRAMES } from "./scenes/Trust";
import { TwoCalls, TWO_CALLS_FRAMES } from "./scenes/TwoCalls";

export const CUT = 15;
export const FILM_FRAMES =
  HOOK_FRAMES + PRESS_FRAMES + TWO_CALLS_FRAMES + OTHER_PATHS_FRAMES + MADE_FOR_HER_FRAMES + TRUST_FRAMES + END_FRAMES - CUT * 6;

export const Film: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence name="Hook" durationInFrames={HOOK_FRAMES} premountFor={fps}>
        <Hook />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: CUT })} />
      <TransitionSeries.Sequence name="One tap" durationInFrames={PRESS_FRAMES} premountFor={fps}>
        <Press />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: CUT })} />
      <TransitionSeries.Sequence name="Two calls" durationInFrames={TWO_CALLS_FRAMES} premountFor={fps}>
        <TwoCalls />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: CUT })} />
      <TransitionSeries.Sequence name="Other paths" durationInFrames={OTHER_PATHS_FRAMES} premountFor={fps}>
        <OtherPaths />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: CUT })} />
      <TransitionSeries.Sequence name="Made for her" durationInFrames={MADE_FOR_HER_FRAMES} premountFor={fps}>
        <MadeForHer />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: CUT })} />
      <TransitionSeries.Sequence name="Trust" durationInFrames={TRUST_FRAMES} premountFor={fps}>
        <Trust />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: CUT })} />
      <TransitionSeries.Sequence name="End" durationInFrames={END_FRAMES} premountFor={fps}>
        <End />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
