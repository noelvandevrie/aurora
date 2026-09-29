import { useEffect, useState } from 'react';

/** The current time, re-rendering every second (countdowns, lock ages). */
export default function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
