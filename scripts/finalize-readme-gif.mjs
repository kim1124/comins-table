import { copyFile, rename, rm } from "node:fs/promises";

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

export async function finalizeReadmeGifs(
  { assets, cleanup, legacyPaths = [] },
  { copyFileForBackup = copyFile, removeFile = rm, renameFile = rename } = {},
) {
  const backups = [];
  let committed = false;
  const replaced = new Set();

  try {
    await cleanup();
  } catch (error) {
    await Promise.allSettled(assets.map(({ readyOutputPath }) =>
      removeFile(readyOutputPath, { force: true })));
    throw error;
  }

  try {
    for (const { outputPath, readyOutputPath } of assets) {
      const backupPath = `${outputPath}.${process.pid}.backup`;
      let hadOriginal = true;

      try {
        await copyFileForBackup(outputPath, backupPath);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          hadOriginal = false;
        } else {
          throw error;
        }
      }

      backups.push({ backupPath, hadOriginal, outputPath });
      await renameFile(readyOutputPath, outputPath);
      replaced.add(outputPath);
    }
    committed = true;
  } catch (error) {
    await Promise.allSettled(backups.map(async ({ backupPath, hadOriginal, outputPath }) => {
      if (hadOriginal) {
        await copyFileForBackup(backupPath, outputPath);
      } else if (replaced.has(outputPath)) {
        await removeFile(outputPath, { force: true });
      }
    }));
    await Promise.allSettled([
      ...assets.map(({ readyOutputPath }) => removeFile(readyOutputPath, { force: true })),
      ...backups.map(({ backupPath }) => removeFile(backupPath, { force: true })),
    ]);
    throw error;
  }

  const cleanupResults = await Promise.allSettled([
    ...legacyPaths.map((path) => removeFile(path, { force: true })),
    ...backups.map(({ backupPath }) => removeFile(backupPath, { force: true })),
  ]);
  const cleanupFailure = cleanupResults.find((result) => result.status === "rejected");

  if (committed && cleanupFailure?.status === "rejected") {
    throw cleanupFailure.reason;
  }
}
