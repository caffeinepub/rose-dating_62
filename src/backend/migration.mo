import Map "mo:core/Map";
import Storage "mo:caffeineai-object-storage/Storage";

module {
  // ── Old types (inline, from previous stable signature) ────────────────────

  type Time = Int;

  type OldUserProfile = {
    name : Text;
    username : Text;
    country : Text;
    gender : ?Text;
    birthYear : ?Nat;
    bio : ?Text;
    profilePicture : ?Storage.ExternalBlob;
  };

  type OldReceiptMessage = {
    sender : Principal;
    receiver : Principal;
    amount : Float;
    fee : Float;
    timestamp : Time;
    summary : Text;
  };

  type OldTradeRequestMessage = {
    requester : Principal;
    amount : Float;
    requestType : Text;
    timestamp : Time;
    summary : Text;
  };

  type OldMessageType = {
    #text : Text;
    #image : Storage.ExternalBlob;
    #video : Storage.ExternalBlob;
    #voice : Storage.ExternalBlob;
    #media : Storage.ExternalBlob;
    #rose : Float;
    #receipt : OldReceiptMessage;
    #tradeRequest : OldTradeRequestMessage;
    #forwardedPost : {
      postId : Text;
      author : Principal;
      contentSnippet : Text;
      timestamp : Time;
      image : ?Storage.ExternalBlob;
    };
  };

  type OldMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : OldMessageType;
    timestamp : Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
  };

  type OldConversation = {
    id : Nat;
    participants : [Principal];
    messages : [OldMessage];
    otherParticipantProfile : ?OldUserProfile;
  };

  type OldGroupMessage = {
    id : Nat;
    groupId : Nat;
    sender : Principal;
    content : OldMessageType;
    timestamp : Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
  };

  // ── New types ──────────────────────────────────────────────────────────────

  type NewMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : OldMessageType;
    timestamp : Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  type NewConversation = {
    id : Nat;
    participants : [Principal];
    messages : [NewMessage];
    otherParticipantProfile : ?OldUserProfile;
  };

  type NewGroupMessage = {
    id : Nat;
    groupId : Nat;
    sender : Principal;
    content : OldMessageType;
    timestamp : Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
    reactions : [(Text, [Principal])];
    readBy : [Principal];
    replyToId : ?Nat;
  };

  // ── Actor state shapes ────────────────────────────────────────────────────

  type OldActor = {
    var conversations : Map.Map<Nat, OldConversation>;
    var groupMessages : Map.Map<Nat, [OldGroupMessage]>;
  };

  type NewActor = {
    var conversations : Map.Map<Nat, NewConversation>;
    var groupMessages : Map.Map<Nat, [NewGroupMessage]>;
  };

  // ── Migration function ────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let newConversations = old.conversations.map<Nat, OldConversation, NewConversation>(
      func(_id, conv) {
        let newMessages = conv.messages.map<OldMessage, NewMessage>(func(msg) {
          { msg with reactions = []; readBy = []; replyToId = null }
        });
        { conv with messages = newMessages }
      }
    );

    let newGroupMessages = old.groupMessages.map<Nat, [OldGroupMessage], [NewGroupMessage]>(
      func(_id, msgs) {
        msgs.map<OldGroupMessage, NewGroupMessage>(func(msg) {
          { msg with reactions = []; readBy = []; replyToId = null }
        })
      }
    );

    {
      var conversations = newConversations;
      var groupMessages = newGroupMessages;
    }
  };
};
