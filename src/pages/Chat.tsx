import { MessageSquare } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ComingSoon } from "@/components/ComingSoon";

const Chat = () => {
  return (
    <Layout>
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
    </Layout>
  );
};

export default Chat;
