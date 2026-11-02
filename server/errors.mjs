export const messages = Object.freeze({
  FAILURE:'The try-on task failed. This saved task will not be resubmitted automatically.',
  UNAUTHORIZED:'Authorization failed (401). Check the server credential only after live access is approved.',
  RATE_LIMIT:'Rate limited (429). Wait before an explicit future retry; no new task was submitted.',
  TIMEOUT:'The task timed out. Submission may have been accepted; do not resubmit without reconciliation.',
  BALANCE:'Insufficient units. Check the account balance before a future live request.',
  NEEDS_REVIEW:'Interrupted or ambiguous submission. Reconcile the saved task before creating another.',
  PROTOCOL:'Unexpected provider response. Inspect the V3 contract before retrying.',
  RESULT_DOWNLOAD:'The result could not be cached safely. Keep the saved task; do not submit it again.',
  RUNTIME_PAUSED:'New submissions are paused after a saved failure. Reconcile the receipts before continuing; refreshing will not retry them.',
  LIVE_DISABLED:'Live API access is disabled in this local prototype.',
  INPUT_NOT_ALLOWLISTED:'Only exact approved demo asset URLs are accepted.',
});
export class AdapterError extends Error {
  constructor(code) {super(messages[code] ?? messages.PROTOCOL);this.code=code in messages?code:'PROTOCOL';}
}
export function safeError(error) {return {code:error instanceof AdapterError?error.code:'FAILURE',message:messages[error instanceof AdapterError?error.code:'FAILURE']};}
