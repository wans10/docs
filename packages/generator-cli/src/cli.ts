import fs from "fs";
import { mkdir, readFile } from "fs/promises";
import path from "path";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

import {
  AbsoluteFilePath,
  cwd,
  doesPathExist,
  resolve,
} from "@fern-api/fs-utils";

import { loadGitHubConfig } from "./configuration/loadGitHubConfig";
import { loadReadmeConfig } from "./configuration/loadReadmeConfig";
import { loadReferenceConfig } from "./configuration/loadReferenceConfig";
import { GitHub } from "./github/GitHub";
import { ReadmeGenerator } from "./readme/ReadmeGenerator";
import { ReadmeParser } from "./readme/ReadmeParser";
import { ReferenceGenerator } from "./reference/ReferenceGenerator";

void yargs(hideBin(process.argv))
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  .scriptName(process.env.CLI_NAME ?? "generator-cli")
  .strict()
  .command(
    "generate readme",
    "Generate a README.md using the provided configuration file.",
    (argv) =>
      argv
        .option("config", {
          string: true,
          requred: true,
        })
        .option("original-readme", {
          string: true,
          requred: false,
        })
        .option("output", {
          string: true,
          requred: false,
        }),
    async (argv) => {
      if (argv.config == null) {
        process.stderr.write(
          "missing required arguments; please specify the --config flag\n"
        );
        process.exit(1);
      }
      const wd = cwd();
      const readmeConfig = await loadReadmeConfig({
        absolutePathToConfig: resolve(wd, argv.config),
      });
      const generator = new ReadmeGenerator({
        readmeParser: new ReadmeParser(),
        readmeConfig,
        originalReadme:
          argv.originalReadme != null
            ? await readFile(argv.originalReadme, "utf8")
            : undefined,
      });
      await generator.generateReadme({
        output: await createWriteStream(argv.output),
      });
      process.exit(0);
    }
  )
  .command(
    "generate-reference",
    "Generate an SDK reference (`reference.md`) using the provided configuration file.",
    (argv) =>
      argv
        .option("config", {
          string: true,
          requred: true,
        })
        .option("output", {
          string: true,
          requred: false,
        }),
    async (argv) => {
      if (argv.config == null) {
        process.stderr.write(
          "missing required arguments; please specify the --config flag\n"
        );
        process.exit(1);
      }
      const wd = cwd();
      const referenceConfig = await loadReferenceConfig({
        absolutePathToConfig: resolve(wd, argv.config),
      });
      const generator = new ReferenceGenerator({
        referenceConfig,
      });
      await generator.generate({
        output: await createWriteStream(argv.output),
      });
      process.exit(0);
    }
  )
  .command("github", "GitHub operations", (yargs) => {
    return yargs
      .command(
        "push",
        "Push changes to GitHub",
        (subYargs) => {
          return subYargs.option("config", {
            string: true,
            required: true,
            description: "Path to configuration file",
          });
        },
        async (argv) => {
          if (argv.config == null) {
            process.stderr.write(
              "missing required arguments; please specify the --config flag\n"
            );
            process.exit(1);
          }
          const wd = cwd();
          const githubConfig = await loadGitHubConfig({
            absolutePathToConfig: resolve(wd, argv.config),
          });
          const github = new GitHub({
            githubConfig,
          });
          await github.push();
          process.exit(0);
        }
      )
      .command(
        "pr",
        "Create a pull request on GitHub",
        (subYargs) => {
          return subYargs.option("config", {
            string: true,
            required: true,
            description: "Path to configuration file",
          });
        },
        async (argv) => {
          if (argv.config == null) {
            process.stderr.write(
              "missing required arguments; please specify the --config flag\n"
            );
            process.exit(1);
          }
          const wd = cwd();
          const githubConfig = await loadGitHubConfig({
            absolutePathToConfig: resolve(wd, argv.config),
          });
          const github = new GitHub({
            githubConfig,
          });
          await github.pr();
          // Implementation for github pr command
          process.stderr.write(
            `Creating PR on GitHub with config: ${resolve(wd, argv.config)}\n`
          );
          process.exit(0);
        }
      )
      .command(
        "release",
        "Create a release on GitHub",
        (subYargs) => {
          return subYargs.option("config", {
            string: true,
            required: true,
            description: "Path to configuration file",
          });
        },
        async (argv) => {
          if (argv.config == null) {
            process.stderr.write(
              "missing required arguments; please specify the --config flag\n"
            );
            const wd = cwd();
            const githubConfig = await loadGitHubConfig({
              absolutePathToConfig: resolve(wd, argv.config),
            });
            const github = new GitHub({
              githubConfig,
            });
            await github.release();
            process.exit(1);
          }
          const wd = cwd();
          // Implementation for github release command
          process.stderr.write(
            `Creating release on GitHub with config: ${resolve(wd, argv.config)}\n`
          );
          process.exit(0);
        }
      )
      .demandCommand();
  })
  .demandCommand()
  .showHelpOnFail(true)
  .parse();

async function createWriteStream(
  outputPath: string | undefined
): Promise<fs.WriteStream> {
  return outputPath != null
    ? await createWriteStreamFromFile(resolve(cwd(), outputPath))
    : (process.stdout as unknown as fs.WriteStream);
}

async function createWriteStreamFromFile(
  filepath: AbsoluteFilePath
): Promise<fs.WriteStream> {
  if (!(await doesPathExist(filepath))) {
    await mkdir(path.dirname(filepath), { recursive: true });
  }
  return fs.createWriteStream(filepath);
}
