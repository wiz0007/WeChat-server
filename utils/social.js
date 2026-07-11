export const buildPairKey = (firstId, secondId) =>
  [String(firstId), String(secondId)].sort().join(":");

export const normalizeUsername = (username = "") =>
  String(username).trim().toLowerCase();

export const canViewerSeeField = (viewerRelationship, audience) => {
  if (audience === "everyone") return true;
  if (audience === "connections") return viewerRelationship === "connected";
  return false;
};

export const serializeUserPreview = (user, viewerRelationship = "none") => {
  const privacy = user.privacy || {};
  const isConnected = viewerRelationship === "connected";
  const isSelf = viewerRelationship === "self";
  const publicProfile = user.profileVisibility === "public";
  const canSeeProfileDetails = isSelf || isConnected || publicProfile;
  const canSeeAvatar =
    isSelf || canViewerSeeField(viewerRelationship, privacy.showAvatarTo || "everyone");
  const canSeeAbout =
    isSelf || canViewerSeeField(viewerRelationship, privacy.showAboutTo || "everyone");
  const canSeeOnline =
    isSelf ||
    canViewerSeeField(viewerRelationship, privacy.showOnlineStatusTo || "connections");
  const canSeeLastSeen =
    isSelf ||
    canViewerSeeField(viewerRelationship, privacy.showLastSeenTo || "connections");

  return {
    _id: user._id,
    name: canSeeProfileDetails ? user.name : "Private user",
    username: user.username,
    avatar: canSeeAvatar ? user.avatar : "",
    about: canSeeProfileDetails && canSeeAbout ? user.about : "",
    headline: canSeeProfileDetails ? user.headline : "",
    location: isSelf || isConnected ? user.location : "",
    profileVisibility: user.profileVisibility,
    isOnline: canSeeOnline ? user.isOnline : false,
    lastSeen: canSeeLastSeen ? user.lastSeen : null,
    relationshipStatus: viewerRelationship,
    canSendConnectionRequest:
      !isSelf &&
      !isConnected &&
      user.privacy?.allowConnectionRequestsFrom !== "none",
    canSendChatRequest:
      !isSelf &&
      (user.privacy?.allowChatRequestsFrom === "everyone" ||
        (user.privacy?.allowChatRequestsFrom === "connections" && isConnected)),
  };
};
