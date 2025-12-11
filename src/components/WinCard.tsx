import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateTime } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-editor";
import { FeedReactions } from "@/components/FeedReactions";
import PostViewDialog from "@/components/dialogs/PostViewDialog";

interface WinCardProps {
  win: {
    id: string;
    employeeName: string;
    avatar?: string;
    date: string;
    content: string;
    image_url?: string;
    taggedMembers?: Array<{ id: string; name: string; avatar?: string }>;
  };
}

const WinCard = ({ win }: WinCardProps) => {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div 
        className="bg-white dark:bg-card rounded-lg border border-border shadow-sm overflow-hidden border-l-4 border-l-amber-500 flex flex-col cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowDialog(true)}
      >
        <div className="p-4 flex-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/50">
                <AvatarImage src={win.avatar} />
                <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
                  {win.employeeName?.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-foreground">{win.employeeName}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(win.date)}</p>
              </div>
            </div>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <div className="line-clamp-5">
            <RichTextContent content={win.content} className="text-sm" />
          </div>
          {win.taggedMembers && win.taggedMembers.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-xs text-muted-foreground">with</span>
              <div className="flex items-center">
                {win.taggedMembers.map((member, index) => (
                  <Link 
                    key={member.id} 
                    to={`/team/${member.id}`} 
                    className={`hover:z-20 hover:scale-110 transition-transform ${index > 0 ? '-ml-1.5' : ''}`}
                    style={{ zIndex: index }}
                    title={member.name}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar className="h-6 w-6 border-2 border-background shadow-sm">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {member.name?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
          <FeedReactions targetType="update" targetId={win.id} />
        </div>
      </div>

      <PostViewDialog 
        open={showDialog} 
        onOpenChange={setShowDialog} 
        post={{
          id: win.id,
          employeeName: win.employeeName,
          avatar: win.avatar,
          date: win.date,
          content: win.content,
          imageUrl: win.image_url,
          taggedMembers: win.taggedMembers
        }}
      />
    </>
  );
};

export default WinCard;
