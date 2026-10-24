export type NoticeKind = 'success' | 'error' | 'info'

export type AppNotice = {
  kind: NoticeKind
  title: string
  message?: string
}

export const noticeEventName = 'tap2connect:notice'

export function notify(notice: AppNotice) {
  window.dispatchEvent(new CustomEvent<AppNotice>(noticeEventName, { detail: notice }))
}
