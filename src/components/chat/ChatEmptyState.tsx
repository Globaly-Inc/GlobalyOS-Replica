import { MessageSquare, Users, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatEmptyStateProps {
  onNewChat: () => void;
  onNewSpace: () => void;
}

const ChatEmptyState = ({ onNewChat, onNewSpace }: ChatEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-background p-8 text-center">
      <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-6">
        <MessageSquare className="h-10 w-10 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Welcome to Team Chat
      </h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Connect with your team in real-time. Start a direct message or create a space for team collaboration.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onNewChat} className="gap-2">
          <Users className="h-4 w-4" />
          Start a chat
        </Button>
        <Button onClick={onNewSpace} variant="outline" className="gap-2">
          <Hash className="h-4 w-4" />
          Create a space
        </Button>
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
        <div className="text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100 text-blue-600 mx-auto mb-3">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="font-medium text-sm">Direct Messages</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Private conversations with team members
          </p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100 text-green-600 mx-auto mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="font-medium text-sm">Group Chats</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Chat with multiple people at once
          </p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100 text-purple-600 mx-auto mb-3">
            <Hash className="h-6 w-6" />
          </div>
          <h3 className="font-medium text-sm">Spaces</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Topic-based channels for teams
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatEmptyState;
