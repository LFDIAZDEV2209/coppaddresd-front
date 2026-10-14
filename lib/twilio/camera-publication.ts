/** Recupera solo la cámara; conserva micrófono, pantalla y sesión de consulta. */
export interface RecoverableCamera {
  kind: string;
  name?: string;
  stop(): void;
  detach(): {remove(): void}[];
}

export async function replacePublishedCamera<T extends RecoverableCamera>(options: {
  current: T[];
  create(): Promise<T>;
  publish(track: T): Promise<unknown>;
  unpublish(track: T): unknown;
  active(): boolean;
}): Promise<T> {
  for (const track of options.current) {
    if (track.kind !== "video" || track.name === "screen") continue;
    await options.unpublish(track);
    track.detach().forEach(el => el.remove());
    track.stop();
  }
  const replacement = await options.create();
  let published = false;
  try {
    if (!options.active()) throw new Error("La consulta ya no está activa.");
    await options.publish(replacement);
    published = true;
    if (!options.active()) throw new Error("La consulta ya no está activa.");
    return replacement;
  } catch (error) {
    if (published) await Promise.resolve(options.unpublish(replacement)).catch(() => {});
    replacement.detach().forEach(el => el.remove());
    replacement.stop();
    throw error;
  }
}
