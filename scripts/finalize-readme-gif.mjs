import { rename, rm } from "node:fs/promises";

export async function finalizeReadmeGif(
  { cleanup, outputPath, readyOutputPath },
  { removeFile = rm, renameFile = rename } = {},
) {
  try {
    await cleanup();
  } catch (error) {
    try {
      await removeFile(readyOutputPath, { force: true });
    } catch {
      // Preserve the original cleanup failure.
    }
    throw error;
  }

  try {
    await renameFile(readyOutputPath, outputPath);
  } catch (error) {
    try {
      await removeFile(readyOutputPath, { force: true });
    } catch {
      // Preserve the original rename failure.
    }
    throw error;
  }
}
