export class OccurredAt {
  public constructor(public readonly date: Date) {}

  static now() {
    return new OccurredAt(new Date());
  }
}
