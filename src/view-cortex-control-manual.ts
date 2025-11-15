import { open } from "@raycast/api";
import { CORTEX_CONTROL_MANUAL_URL } from "../lib/constants";

export default async function Command() {
  await open(CORTEX_CONTROL_MANUAL_URL);
}

