import ChatWidget from '@/components/chat/ChatWidget';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <ChatWidget />
    </div>
  );
}