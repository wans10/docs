import { cp, lstat, readFile, readdir, rm } from "fs/promises";
import path, { resolve } from "path";
import { SimpleGit } from "simple-git";

import { FERNIGNORE, GITIGNORE, GIT_DIR, README_FILEPATH } from "./constants";

const DEFAULT_IGNORED_FILES = [FERNIGNORE, GITIGNORE, GIT_DIR];

// ClonedRepository is a repository that has been successfully cloned to the local file system
// and is ready to be used.
export class ClonedRepository {
  private clonePath: string;
  private git: SimpleGit;

  constructor({ clonePath, git }: { clonePath: string; git: SimpleGit }) {
    this.clonePath = clonePath;
    this.git = git;
  }

  public async getDefaultBranch(): Promise<string> {
    await this.git.cwd(this.clonePath);
    const remoteInfo = await this.git.remote(["show", "origin"]);
    if (remoteInfo == null) {
      throw new Error("Could not determine default branch");
    }
    const match = remoteInfo.match(/HEAD branch: (.+)/);
    if (!match?.[1]) {
      throw new Error("Could not determine default branch");
    }
    return match[1].trim();
  }

  public async getReadme(): Promise<string | undefined> {
    return await this.readFile({ relativeFilePath: README_FILEPATH });
  }

  public async getFernignore(): Promise<string | undefined> {
    return await this.readFile({ relativeFilePath: FERNIGNORE });
  }

  public async add(files: string | string[]): Promise<void> {
    await this.git.cwd(this.clonePath);
    await this.git.add(files);
  }

  public async restoreFiles({
    files,
    staged,
  }: {
    files: string | string[];
    staged?: boolean;
  }): Promise<void> {
    await this.git.cwd(this.clonePath);
    const args = ["restore"];
    if (staged) {
      args.push("--staged");
    }
    await this.git.raw([...args, ...(Array.isArray(files) ? files : [files])]);
  }

  public async commit(message?: string): Promise<void> {
    await this.git.cwd(this.clonePath);
    await this.git.commit(message ?? `Automated commit`, undefined, {
      "--allow-empty": null,
    });
  }

  public async checkout(branch: string): Promise<void> {
    await this.git.cwd(this.clonePath);
    try {
      // Try regular checkout first
      await this.git.checkout(branch);
    } catch (_error) {
      // If checkout fails, create a new branch
      await this.git.checkoutLocalBranch(branch);
      // Push the new branch to remote
      await this.git.push("origin", branch, { "--set-upstream": null });
    }
  }

  public async pull(branch: string): Promise<void> {
    await this.git.cwd(this.clonePath);
    await this.git.pull("origin", branch);
  }

  public async push(): Promise<void> {
    await this.git.cwd(this.clonePath);
    await this.git.push();
  }

  public async overwriteLocalContents(
    sourceDirectoryPath: string
  ): Promise<void> {
    const [sourceContents, destContents] = await Promise.all([
      readdir(sourceDirectoryPath),
      readdir(this.clonePath),
    ]);

    await Promise.all(
      destContents
        .filter((content) => !DEFAULT_IGNORED_FILES.includes(content))
        .map(async (content) => {
          await rm(resolve(this.clonePath, content), {
            recursive: true,
            force: true,
          });
        })
    );

    await Promise.all(
      sourceContents
        .filter((content) => !DEFAULT_IGNORED_FILES.includes(content))
        .map(async (content) => {
          const path = resolve(sourceDirectoryPath, content);
          await cp(path, resolve(this.clonePath, content), { recursive: true });
        })
    );
  }

  private async readFile({
    relativeFilePath,
  }: {
    relativeFilePath: string;
  }): Promise<string | undefined> {
    const absoluteFilePath = path.join(this.clonePath, relativeFilePath);
    if (!(await doesPathExist(absoluteFilePath))) {
      return undefined;
    }
    return await readFile(absoluteFilePath, "utf-8");
  }
}

async function doesPathExist(filepath: string): Promise<boolean> {
  try {
    await lstat(filepath);
    return true;
  } catch {
    return false;
  }
}
