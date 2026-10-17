import { useLayoutEffect, useRef } from 'react';
// Chat-style feeds: on every new line, scroll the feed to its newest entry and
// bring the anchor (the input row, or the feed itself) back on screen, since
// the page can scroll past the feed or leave it under the rankings ticket.
export function useFeedScroll(count) {
  const feedRef   = useRef(null);
  const anchorRef = useRef(null);
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTop = feed.scrollHeight;
    (anchorRef.current ?? feed).scrollIntoView?.({ block: 'nearest' });
  }, [count]);
  return [feedRef, anchorRef];
}
