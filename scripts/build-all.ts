import { execFileSync } from "node:child_process";

for (const script of ["discover", "crawl", "parse", "normalize", "generate"]) {
  execFileSync("npm", ["run", script], {
    stdio: "inherit"
  });
}
