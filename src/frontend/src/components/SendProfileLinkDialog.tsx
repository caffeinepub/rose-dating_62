import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import { MessageCircle, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MessageType } from "../backend";
import {
  useGetConversations,
  useGetGroupChats,
  useSendGroupMessage,
  useSendMessage,
} from "../hooks/useQueries";

interface SendProfileLinkDialogProps {
  open: boolean;
  onClose: () => void;
  profileUrl: string;
  userId: string;
}

/**
 * Dialog for sending a profile link to an existing conversation or group chat
 */
export default function SendProfileLinkDialog({
  open,
  onClose,
  profileUrl,
  userId,
}: SendProfileLinkDialogProps) {
  const { data: conversations } = useGetConversations();
  const { data: groupChats } = useGetGroupChats();
  const sendMessage = useSendMessage();
  const sendGroupMessage = useSendGroupMessage();
  const [sending, setSending] = useState(false);

  const handleSendToConversation = async (conversationId: bigint) => {
    setSending(true);
    try {
      const conversation = conversations?.find((c) => c.id === conversationId);
      if (!conversation) {
        toast.error("Conversation not found");
        return;
      }

      const receiver = conversation.participants.find(
        (p) => p.toString() !== userId,
      );
      if (!receiver) {
        toast.error("Receiver not found");
        return;
      }

      const content: MessageType = {
        __kind__: "text",
        text: profileUrl,
      };

      await sendMessage.mutateAsync({ receiver, content });
      toast.success("Profile link sent!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to send profile link");
    } finally {
      setSending(false);
    }
  };

  const handleSendToGroup = async (groupId: bigint) => {
    setSending(true);
    try {
      const content: MessageType = {
        __kind__: "text",
        text: profileUrl,
      };

      await sendGroupMessage.mutateAsync({ groupId, content });
      toast.success("Profile link sent to group!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to send profile link");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Profile Link</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations">
              <MessageCircle className="h-4 w-4 mr-2" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="h-4 w-4 mr-2" />
              Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {conversations && conversations.length > 0 ? (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Button
                      key={conv.id.toString()}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => handleSendToConversation(conv.id)}
                      disabled={sending}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        {conv.otherParticipantProfile?.profilePicture ? (
                          <AvatarImage
                            src={conv.otherParticipantProfile.profilePicture.getDirectURL()}
                          />
                        ) : null}
                        <AvatarFallback>
                          {conv.otherParticipantProfile?.name
                            ?.charAt(0)
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium">
                          {conv.otherParticipantProfile?.name || "Unknown User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{conv.otherParticipantProfile?.username || "unknown"}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No conversations available
                </p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              {groupChats && groupChats.length > 0 ? (
                <div className="space-y-2">
                  {groupChats.map((group) => (
                    <Button
                      key={group.id.toString()}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => handleSendToGroup(group.id)}
                      disabled={sending}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        {group.avatar ? (
                          <AvatarImage src={group.avatar.getDirectURL()} />
                        ) : (
                          <AvatarImage src="/assets/generated/group-avatar-placeholder.dim_200x200.png" />
                        )}
                        <AvatarFallback>
                          <Users className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.participants.length} members
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No group chats available
                </p>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
