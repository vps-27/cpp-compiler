import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import path from "node:path";
import { Router, type IRouter } from "express";
import { CompileCppBody, CompileCppResponse } from "@workspace/api-zod";

const execFileAsync = promisify(execFile);
const router: IRouter = Router();
const MAX_OUTPUT = 120_000;
const COMPILE_TIMEOUT_MS = 8_000;
const RUN_TIMEOUT_MS = 5_000;

function runBinary(file: string, args: string[], cwd: string, input: string) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }>(
    (resolve, reject) => {
      const child = spawn(file, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, RUN_TIMEOUT_MS);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode, timedOut });
      });
      child.stdin.end(input);
    },
  );
}

function trimOutput(value: string) {
  return value.length > MAX_OUTPUT
    ? `${value.slice(0, MAX_OUTPUT)}\n[output truncated]`
    : value;
}

router.post("/compile", async (req, res) => {
  const parsed = CompileCppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Source must be between 1 and 100,000 characters." });
    return;
  }

  const startedAt = Date.now();
  const workdir = await mkdtemp(path.join(tmpdir(), "cpp-compiler-"));
  const sourcePath = path.join(workdir, "main.cpp");
  const binaryPath = path.join(workdir, "main");

  try {
    await writeFile(sourcePath, parsed.data.source, "utf8");

    try {
      await execFileAsync(
        "g++",
        ["-std=c++17", "-O0", "-pipe", "-Wall", "-Wextra", sourcePath, "-o", binaryPath],
        { cwd: workdir, timeout: COMPILE_TIMEOUT_MS, maxBuffer: MAX_OUTPUT },
      );
    } catch (error) {
      const result = CompileCppResponse.parse({
        status: "compile_error",
        stdout: "",
        stderr: trimOutput(
          typeof error === "object" && error && "stderr" in error
            ? String(error.stderr)
            : "Compilation failed.",
        ),
        exitCode:
          typeof error === "object" && error && "code" in error && typeof error.code === "number"
            ? error.code
            : 1,
        durationMs: Date.now() - startedAt,
      });
      res.json(result);
      return;
    }

    try {
      const run = await runBinary(binaryPath, [], workdir, parsed.data.stdin ?? "");
      const result = CompileCppResponse.parse({
        status: run.timedOut ? "timeout" : run.exitCode === 0 ? "success" : "runtime_error",
        stdout: trimOutput(run.stdout),
        stderr: trimOutput(
          run.timedOut && !run.stderr
            ? "Program exceeded the 5 second execution limit."
            : run.stderr,
        ),
        exitCode: run.exitCode,
        durationMs: Date.now() - startedAt,
      });
      res.json(result);
    } catch (error) {
      const result = CompileCppResponse.parse({
        status: "runtime_error",
        stdout: trimOutput(
          typeof error === "object" && error && "stdout" in error ? String(error.stdout) : "",
        ),
        stderr: trimOutput(
          typeof error === "object" && error && "stderr" in error
            ? String(error.stderr)
            : "Program exited with a runtime error.",
        ),
        exitCode:
          typeof error === "object" && error && "code" in error && typeof error.code === "number"
            ? error.code
            : null,
        durationMs: Date.now() - startedAt,
      });
      res.json(result);
    }
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
});

export default router;