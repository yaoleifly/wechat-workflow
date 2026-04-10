#!/usr/bin/env node
// CLI 模式：node src/cli.js "选题"
// 或直接 npm start 后交互式输入

import { runFullWorkflow, STEPS } from "./workflow.js";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const divider = chalk.gray("─".repeat(60));

async function main() {
  console.log();
  console.log(chalk.bold("  📝 公众号创作工作台"));
  console.log(chalk.gray("  输入选题，自动走完 9 步工作流"));
  console.log(divider);
  console.log();

  // 获取选题
  let topic = process.argv[2];
  if (!topic) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "topic",
        message: "请输入选题：",
        validate: (v) => (v.trim() ? true : "选题不能为空"),
      },
    ]);
    topic = answer.topic;
  }

  console.log();
  console.log(chalk.cyan(`  选题：${topic}`));
  console.log(divider);

  let spinner;
  const startTime = Date.now();

  try {
    const results = await runFullWorkflow(topic, {
      onStepStart(idx, step) {
        console.log();
        spinner = ora({
          text: chalk.bold(`Step ${step.id}: ${step.label}`),
          prefixText: `  ${step.icon}`,
        }).start();
      },

      onStepStream(idx, chunk) {
        // 流式输出时更新 spinner 文字
        if (spinner) {
          const preview = chunk.replace(/\n/g, " ").slice(0, 40);
          spinner.text = chalk.bold(`Step ${STEPS[idx].id}: ${STEPS[idx].label}`) + chalk.gray(` ${preview}...`);
        }
      },

      onStepDone(idx, result) {
        if (spinner) {
          spinner.succeed(
            chalk.bold(`Step ${STEPS[idx].id}: ${STEPS[idx].label}`) +
              chalk.green(" ✓") +
              chalk.gray(` (${result.length} 字)`)
          );
        }

        // 打印结果预览（前 3 行）
        const preview = result.split("\n").slice(0, 3).join("\n");
        console.log(chalk.gray(`  ${preview.replace(/\n/g, "\n  ")}`));
        if (result.split("\n").length > 3) {
          console.log(chalk.gray(`  ...（共 ${result.split("\n").length} 行）`));
        }
      },

      onError(idx, err) {
        if (spinner) {
          spinner.fail(chalk.red(`Step ${STEPS[idx].id} 出错：${err.message}`));
        }
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log();
    console.log(divider);
    console.log(chalk.green.bold("  ✅ 全流程完成") + chalk.gray(` (${elapsed}s)`));
    console.log();

    // 保存终稿
    const outputDir = join(process.cwd(), "output");
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 10);
    const safeTitle = topic.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 50);

    // 保存终稿
    const finalPath = join(outputDir, `${timestamp}_${safeTitle}.md`);
    writeFileSync(finalPath, results[8] || results[7] || results[3], "utf-8");
    console.log(chalk.cyan(`  📄 终稿已保存：${finalPath}`));

    // 保存全流程记录
    const logPath = join(outputDir, `${timestamp}_${safeTitle}_全流程.md`);
    let logContent = `# 公众号创作记录\n\n选题：${topic}\n日期：${timestamp}\n\n---\n\n`;
    for (let i = 0; i < 9; i++) {
      if (results[i]) {
        logContent += `## Step ${i + 1}: ${STEPS[i].label}\n\n${results[i]}\n\n---\n\n`;
      }
    }
    writeFileSync(logPath, logContent, "utf-8");
    console.log(chalk.cyan(`  📋 全流程记录：${logPath}`));

    console.log();
    console.log(chalk.gray("  复制终稿到 md.newkit.site 一键转公众号格式"));
    console.log();

    // 询问是否继续
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "接下来？",
        choices: [
          { name: "退出", value: "exit" },
          { name: "再写一篇", value: "again" },
        ],
      },
    ]);

    if (action === "again") {
      return main();
    }
  } catch (err) {
    console.error(chalk.red(`\n  ❌ 工作流中断：${err.message}\n`));
    process.exit(1);
  }
}

main();
