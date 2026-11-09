// Follow is a toggle endpoint. Read before every attempt, including retries,
// so an ambiguous successful request is not blindly reversed.
export async function reconcileFollow(
  desired: boolean,
  read: () => Promise<boolean>,
  toggle: () => Promise<{ following: boolean }>,
) {
  if ((await read()) === desired) return desired;
  const result = await toggle();
  if (result.following !== desired)
    throw new Error(
      "Following changed elsewhere. Check the current state and retry.",
    );
  return result.following;
}
