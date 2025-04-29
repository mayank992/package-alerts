// types
import type { Package } from "./types";

const isScopedPackage = (name: string): boolean => name.startsWith("@");

/**
 * Builds the escaped name part of the URL for a package.
 *
 * Example:
 *   "react" -> "react"
 *   "@babel/core" -> "@babel%2Fcore"
 */
const getEscapedPackageName = (name: string): string => {
  if (isScopedPackage(name)) {
    return `@${encodeURIComponent(name.slice(1))}`;
  }

  return encodeURIComponent(name);
};

/**
 * Builds the tarball file name for a package.
 */
const getTarballFileName = (name: string, version: string): string => {
  const baseName = isScopedPackage(name) ? name.split("/")[1] : name;
  return `${baseName}-${version}.tgz`;
};

/**
 * Returns the full tarball URL for a given package info.
 */
export const getPackageTarballUrl = (
  pkg: Package,
  registryUrl: string
): string => {
  const escapedName = getEscapedPackageName(pkg.name);
  const tarballFileName = getTarballFileName(pkg.name, pkg.version);

  // Ensure registry URL has no trailing slash
  registryUrl = registryUrl.replace(/\/$/, "");

  return `${registryUrl}/${escapedName}/-/${tarballFileName}`;
};
