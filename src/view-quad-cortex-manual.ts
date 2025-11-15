import { open } from "@raycast/api";
import { MANUAL_URL } from "../lib/constants";

export default async function Command() {
  await open(MANUAL_URL);
}
