// The API toggles interest. Reconcile before retrying; never optimistically toggle.
export async function reconcileInterest(
  desired: boolean,
  read: () => Promise<boolean>,
  toggle: () => Promise<{ joined: boolean }>,
): Promise<boolean> {
  if ((await read()) === desired) return desired;
  const result = await toggle();
  if (result.joined !== desired)
    throw new Error("Interest changed elsewhere. Refresh and try again.");
  return result.joined;
}
