import type {
  BookSlotRequest,
  BookedMeeting,
  BookingPublicView,
} from "../types/api";

/**
 * Public booking endpoints don't need a JWT — they accept anonymous
 * requests. This module wraps them with a bare `fetch` so the
 * `<BookingWidget>` can be dropped into any host site without requiring
 * a configured CrmClient or CrmProvider.
 */

export class PublicBookingError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PublicBookingError";
  }
}

async function readError(res: Response): Promise<PublicBookingError> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.text();
    if (body) message = `${message}: ${body}`;
  } catch {
    // swallow body-read errors
  }
  return new PublicBookingError(res.status, message);
}

export async function fetchBookingView(
  apiBaseUrl: string,
  slug: string,
  from: Date,
  to: Date,
): Promise<BookingPublicView> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const res = await fetch(
    `${apiBaseUrl}/public/booking/${encodeURIComponent(slug)}?${params}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw await readError(res);
  return (await res.json()) as BookingPublicView;
}

export async function bookSlot(
  apiBaseUrl: string,
  slug: string,
  body: BookSlotRequest,
): Promise<BookedMeeting> {
  const res = await fetch(
    `${apiBaseUrl}/public/booking/${encodeURIComponent(slug)}/book`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await readError(res);
  return (await res.json()) as BookedMeeting;
}
