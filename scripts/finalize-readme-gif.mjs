import { rename, rm } from "node:fs/promises";

export async function finalizeReadmeGif({ cleanup, outputPath, readyOutputPath }) {
  try {
    await cleanup();
  } catch (error) {
    await rm(readyOutputPath, { force: true });
    throw error;
  }

  await rename(readyOutputPath, outputPath);
}
