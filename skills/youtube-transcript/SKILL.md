---
name: youtube-transcript
description: >-
  获取 YouTube 视频字幕和简洁内容文件。用户给出 YouTube 视频链接并要求下载字幕、保存 SRT/TXT、提取视频简介或元信息、整理视频文字稿时使用。使用 yt-dlp 检查字幕，优先中文、缺失时回退英文，并生成 SRT、纯文本 TXT 和元信息 JSON。
compatibility: >-
  需要 Python 3 和 yt-dlp。yt-dlp 安装说明见 https://github.com/yt-dlp/yt-dlp#installation 。
---

# YouTube Transcript

根据用户提供的 YouTube 视频链接，保存所选语言的字幕、纯文本稿和视频元信息。只处理中文与英文字幕，不下载视频内容。

## 工作流程

1. 检查 `yt-dlp --version`。如果命令不存在，按 [yt-dlp 官方安装指南](https://github.com/yt-dlp/yt-dlp#installation) 中适合当前环境的方法安装，再继续。
2. 验证用户给出的是 YouTube 视频链接。创建临时工作目录，并运行 `yt-dlp --list-subs URL` 查看该视频可用的人工字幕与自动生成字幕。也可用 `yt-dlp --dump-single-json --skip-download URL` 获取结构化字幕列表与视频信息。
3. 只在可用轨道中选择字幕，语言优先级如下：
   - 首选中文：`zh-CN`、`zh-TW`、`zh-Hans`、`zh-Hant`，然后是其他以 `zh` 开头的标签。
   - 若没有中文轨道，再选择英文：`en` 或以 `en-` / `en_` 开头的标签。
   - 相同语言优先人工字幕；没有人工字幕时使用自动生成字幕。不要下载列表之外的语言，也不要将英文翻译或伪装成中文。
   - 有多条同优先级轨道时，优先常用地区变体（中文 `zh-CN`、英文 `en`），再按 yt-dlp 返回的顺序选第一条。
4. 用 `--skip-download` 下载所选轨道并转换成 SRT。人工字幕使用 `--write-subs`，自动字幕使用 `--write-auto-subs`。将 `--sub-langs` 限定为所选的精确语言标签，并设置 `--sub-format "srt/best" --convert-subs srt --write-info-json`。使用输出模板将文件放在 `youtube-transcripts/<video-id>/` 下。不要将代理值写入命令输出、日志或生成的文件。
5. 从所下载的 SRT 与 `.info.json` 运行本 skill 附带的脚本：

   ```bash
   python "<skill目录>/scripts/build_transcript.py" \
     --srt "<下载得到的字幕.srt>" \
     --info-json "<下载得到的元信息.info.json>" \
     --output-dir "youtube-transcripts/<video-id>" \
     --language "<选中的语言标签>" \
     --automatic
   ```

   仅当选择的是自动字幕时传入 `--automatic`；人工字幕不传该选项。脚本会生成与 SRT 同目录的纯文本稿和精简元信息 JSON。
6. 确认输出目录中最终包含一个 `.srt`、一个 `.txt` 和一个 `.json`。临时文件可以清理；保留用户需要的三个成品。
7. 简洁告知用户三个文件的路径、字幕语言和轨道类型。若没有中文或英文字幕、下载失败或字幕内容为空，明确说明原因，不生成虚构内容。

## 代理

yt-dlp 通常能读取标准代理环境变量。若当前环境需要显式代理，可从 `HTTPS_PROXY`、`HTTP_PROXY` 或 `ALL_PROXY` 读取已有配置，并通过 yt-dlp 的 `--proxy` 传入。优先使用环境里设置的 HTTPS 代理，其次 HTTP，再其次 ALL。不要在 Skill、shell 示例、日志或结果中保存或回显代理凭据。没有这些变量时不添加代理参数。

## 文件命名

使用视频 ID 作为目录名和基础文件名，避免标题中的斜杠、emoji 等字符影响路径。例如：

```text
youtube-transcripts/3lPnN8omdPA/
├── 3lPnN8omdPA.zh-CN.srt
├── 3lPnN8omdPA.txt
└── 3lPnN8omdPA.json
```

实际 SRT 文件名以 yt-dlp 的输出为准；TXT 与 JSON 由脚本写成 `<video-id>.txt` 和 `<video-id>.json`。

## 边界

- 仅针对用户提供的视频链接获取字幕和公开元信息；不下载视频或音频。
- 不绕过登录、付费墙、年龄验证或访问控制。若视频要求用户授权或不可访问，说明需要用户在本机完成相应授权后再重试。
- 只输出用户要求的成品路径和简要状态，不在对话中粘贴整份字幕或完整简介，除非用户另行要求。
