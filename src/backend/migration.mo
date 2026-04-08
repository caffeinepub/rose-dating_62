import Map "mo:core/Map";
import Storage "mo:caffeineai-object-storage/Storage";
import Time "mo:base/Time";
import Principal "mo:core/Principal";

module {
  // ── Old types (inlined from .old/src/backend/main.mo) ──────────────────────

  type OldMessageType = {
    #text : Text;
    #image : Storage.ExternalBlob;
    #video : Storage.ExternalBlob;
    #voice : Storage.ExternalBlob;
    #media : Storage.ExternalBlob;
    #rose : Float;
    #receipt : {
      sender : Principal;
      receiver : Principal;
      amount : Float;
      fee : Float;
      timestamp : Time.Time;
      summary : Text;
    };
    #tradeRequest : {
      requester : Principal;
      amount : Float;
      requestType : Text;
      timestamp : Time.Time;
      summary : Text;
    };
    #forwardedPost : {
      postId : Text;
      author : Principal;
      contentSnippet : Text;
      timestamp : Time.Time;
      image : ?Storage.ExternalBlob;
    };
  };

  type OldUserProfile = {
    name : Text;
    username : Text;
    country : Text;
    gender : ?Text;
    birthYear : ?Nat;
    bio : ?Text;
    profilePicture : ?Storage.ExternalBlob;
  };

  type OldMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : OldMessageType;
    timestamp : Time.Time;
    senderProfile : ?OldUserProfile;
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
    timestamp : Time.Time;
    senderProfile : ?OldUserProfile;
  };

  // ── New types ───────────────────────────────────────────────────────────────

  type NewMessage = {
    id : Nat;
    sender : Principal;
    receiver : Principal;
    content : OldMessageType;
    timestamp : Time.Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
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
    timestamp : Time.Time;
    senderProfile : ?OldUserProfile;
    isEdited : Bool;
    isDeleted : Bool;
  };

  // ── Actor state shapes ──────────────────────────────────────────────────────

  public type OldActor = {
    conversations : Map.Map<Nat, OldConversation>;
    groupMessages : Map.Map<Nat, [OldGroupMessage]>;
  };

  public type NewActor = {
    conversations : Map.Map<Nat, NewConversation>;
    groupMessages : Map.Map<Nat, [NewGroupMessage]>;
  };

  // ── Migration function ──────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let conversations = old.conversations.map<Nat, OldConversation, NewConversation>(
      func(_id, conv) {
        let newMessages = conv.messages.map(
          func(msg) { { msg with isEdited = false; isDeleted = false } }
        );
        { conv with messages = newMessages }
      }
    );

    let groupMessages = old.groupMessages.map<Nat, [OldGroupMessage], [NewGroupMessage]>(
      func(_id, msgs) {
        msgs.map<OldGroupMessage, NewGroupMessage>(
          func(msg) { { msg with isEdited = false; isDeleted = false } }
        )
      }
    );

    { conversations; groupMessages }
  };
};
