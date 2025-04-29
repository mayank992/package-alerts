// libs
import { execSync } from "child_process";

// helpers
import { ConcurrentTask } from "./ConcurrentTask";
import { getPackageTarballUrl } from "./helpers";

// types
import type { Package } from "./types";

// constants
import {
  PUBLIC_NPM_REGISTRY,
  PRIVATE_PACKAGE_PREFIX,
  getPrivateRegistryInfo,
} from "./constants";

const getAllPackages = (): Package[] => {
  try {
    const rawOutput = execSync(`yarn info --json --name-only -A`, {
      encoding: "utf-8",
    });

    const packages = `[${rawOutput.split("\n").join(",").slice(0, -1)}]`;
    const parsedPkgs = JSON.parse(packages) as string[];

    return parsedPkgs
      .filter((pkg) => pkg.includes("@npm:"))
      .map((pkg) => {
        const [name, version] = pkg.split("@npm:");
        return {
          name,
          version,
          private: name.startsWith(PRIVATE_PACKAGE_PREFIX),
        };
      });
  } catch (error) {
    console.error("❌ Failed to retrieve packages:", error);
    return [];
  }
};

const checkIfPackageExistsOnPublicRegistry = async (
  pkg: Package
): Promise<boolean> => {
  const tarballUrl = getPackageTarballUrl(pkg, PUBLIC_NPM_REGISTRY);

  try {
    const response = await fetch(tarballUrl, { method: "HEAD" });

    if (response.ok) {
      return true;
    }

    if (response.status === 404) {
      return false;
    }

    console.error(
      `Error: Received unexpected status ${response.status} for package ${pkg.name}@${pkg.version} from private registry.`
    );
  } catch (error) {
    console.error(
      `Error checking package ${pkg.name}@${pkg.version} in public registry:`,
      error
    );
  }

  return false;
};

const checkIfPackageExistsOnPrivateRegistry = async (
  pkg: Package
): Promise<boolean> => {
  const { url, authToken } = getPrivateRegistryInfo();
  const tarballUrl = getPackageTarballUrl(pkg, url);

  try {
    const response = await fetch(tarballUrl, {
      method: "HEAD",
      headers: { authorization: authToken },
    });

    if (response.ok) {
      return true;
    }

    if (response.status === 404) {
      return false;
    }

    console.error(
      `Error: Received unexpected status ${response.status} for package ${pkg.name}@${pkg.version} from private registry.`
    );
  } catch (error) {
    console.error(
      `Error checking package ${pkg.name}@${pkg.version} in public registry:`,
      error
    );
  }

  return false;
};

const main = async (): Promise<void> => {
  console.log("🔎 Fetching all packages...");

  const packages = getAllPackages();

  if (packages.length === 0) {
    console.error("❌ No packages found. Exiting.");
    return;
  }

  console.log(`📦 Found ${packages.length} packages to check.\n`);

  const problematicPackages: {
    package: Package;
    public: boolean;
    private: boolean;
  }[] = [];

  const taskRunner = new ConcurrentTask({ concurrency: 10 });

  const promises = packages.map((pkg) =>
    taskRunner.enqueue(async () => {
      if (pkg.private) {
        const privatePkg = await checkIfPackageExistsOnPrivateRegistry(pkg);

        console.log(
          `${pkg.name}@${pkg.version} -> public: -, private: ${privatePkg}`
        );

        if (!privatePkg) {
          problematicPackages.push({
            package: pkg,
            public: false,
            private: false,
          });
        }

        return;
      }

      const publicPkg = await checkIfPackageExistsOnPublicRegistry(pkg);
      const privatePkg = await checkIfPackageExistsOnPrivateRegistry(pkg);

      console.log(
        `${pkg.name}@${pkg.version} -> public: ${publicPkg}, private: ${privatePkg}`
      );

      if ((privatePkg && !publicPkg) || (!privatePkg && !publicPkg)) {
        problematicPackages.push({
          package: pkg,
          public: publicPkg,
          private: privatePkg,
        });
      }
    })
  );

  await Promise.allSettled(promises);

  reportProblematicPackages(problematicPackages);
};

const reportProblematicPackages = (
  problematic: { package: Package; public: boolean; private: boolean }[]
): void => {
  if (problematic.length === 0) {
    console.log("✅ No problematic packages found!");
    return;
  }

  console.log("\n🚨 Problematic packages found:");
  console.table(
    problematic.map((p) => ({
      Package: `${p.package.name}@${p.package.version}`,
      "Public Available": p.package.private ? "—" : p.public ? "✅" : "❌",
      "Private Available": p.private ? "✅" : "❌",
    })),
    ["Package", "Public Available", "Private Available"]
  );
};

main();
