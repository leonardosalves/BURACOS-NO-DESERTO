import { Config } from "@remotion/cli/config";

// Long-form Lumiera renders (2K + many AI clips) need more time to extract video frames.
Config.setDelayRenderTimeoutInMilliseconds(180_000);