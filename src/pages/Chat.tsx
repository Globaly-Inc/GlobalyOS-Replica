import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Chat = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Chat</h1>
          <p className="text-muted-foreground text-sm">Team messaging and communication</p>
        </div>
        <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Feature in Development</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Team chat functionality will be available soon. Stay tuned for real-time messaging, channels, and direct messages.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chat;
