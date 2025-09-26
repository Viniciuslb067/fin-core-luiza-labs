export class OccurredAt {
  private constructor(public readonly date: Date) {}

  static now() {
    return new OccurredAt(new Date());
  }
}
