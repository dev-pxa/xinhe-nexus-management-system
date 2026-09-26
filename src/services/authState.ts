let currentUser: API.UserInfo | undefined;

export function getAuthenticatedUser() {
  return currentUser;
}

export function setAuthenticatedUser(user?: API.UserInfo) {
  currentUser = user;
}
