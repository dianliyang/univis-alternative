export async function loadPublishedJson<T>(fileName: string): Promise<T> {
  const primary = await fetch(`/api/data/${fileName}`);
  if (primary.ok) {
    return (await primary.json()) as T;
  }

  const fallback = await fetch(`/data/${fileName}`);
  if (!fallback.ok) {
    throw new Error(`Failed to load ${fileName}: ${primary.status}/${fallback.status}`);
  }

  return (await fallback.json()) as T;
}
