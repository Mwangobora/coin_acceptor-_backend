export type AccessTokenPayload = {
  sub: string;
  sessionId: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  sessionId: string;
  tokenFamilyId: string;
  type: 'refresh';
};
