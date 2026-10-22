let serial = 0;
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(++serial).toString(36)}`;
}
