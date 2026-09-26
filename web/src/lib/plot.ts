/**
 * Even-stride downsampling for plot input.
 *
 * Kept in its own module so component files export only components, which is
 * what makes React Fast Refresh work in development.
 */
export function thin<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const stride = Math.ceil(items.length / max);
  return items.filter((_, i) => i % stride === 0);
}
