export async function waitForReadmeState(
  condition,
  message,
  { attempts = 50, interval = 20 } = {},
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await condition()) return;
    if (attempt + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error(`readme-gif: ${message}`);
}
