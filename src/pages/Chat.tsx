import { MessageSquare } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

const Chat = () => {
  return (
    <ComingSoon
      icon={MessageSquare}
      title="Chat"
      description="Team messaging and real-time communication hub."
      features={[
        "Direct messages and group chats",
        "Channel-based conversations",
        "File sharing and attachments",
        "Message search and history",
      ]}
    />
  );
};

export default Chat;
