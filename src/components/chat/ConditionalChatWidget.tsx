'use client';

import { usePathname } from 'next/navigation';
import ChatWidget from './ChatWidget';

const HIDDEN_PREFIXES = ['/dashboard', '/login'];

export default function ConditionalChatWidget() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }
  return <ChatWidget />;
}
