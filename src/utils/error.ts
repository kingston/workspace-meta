export class ErrorWithHelpMessage extends Error {
  constructor(
    message: string,
    public helpMessage: string,
  ) {
    super(message);
  }
}
