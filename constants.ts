export const PRIVATE_PACKAGE_PREFIX = ""; // update

export const PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org";

export const getPrivateRegistryInfo = (): {
  url: string;
  authToken: string;
} => ({
  url: "", // <registry-url>, update
  authToken: "", // <auth-token>, update
});
