import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { XmlLectureRecord } from "../parsers/lecture-xml.js";
import type { HtmlLectureDetail } from "../parsers/lecture-detail.js";

export async function writeXmlLectureMarkdown(
  rootDir: string,
  lectures: XmlLectureRecord[],
  detailByKey: Map<string, HtmlLectureDetail> = new Map()
): Promise<void> {
  const outputDir = join(rootDir, "site", "docs", "courses", "xml-import");
  await mkdir(outputDir, { recursive: true });
  await clearGeneratedMarkdown(outputDir);

  const sorted = [...lectures].sort((a, b) => a.title.localeCompare(b.title));
  const filenameByKey = buildUniqueFilenames(sorted);
  for (const lecture of sorted) {
    const detail = detailByKey.get(lecture.key);
    const extraFieldLines = Object.entries(lecture.extraFields)
      .map(([key, values]) => `- \`${key}\`: ${values.join(", ")}`)
      .join("\n");

    const terms = lecture.terms
      .map((term) =>
        [
          term.startdate,
          term.starttime ? `${term.starttime}-${term.endtime ?? ""}`.replace(/-$/, "") : undefined,
          term.repeat,
          term.roomKey ? formatRoomLink(term.roomKey, lecture.sourceUrl) : undefined
        ]
          .filter(Boolean)
          .join(" | ")
      )
      .filter(Boolean)
      .map((line) => `- ${line}`)
      .join("\n");

    const content = `# ${lecture.title}

- Lecture ID: ${lecture.id}
- Semester: ${lecture.semester ?? "Unknown"}
- Language: ${lecture.language}
- Short code: ${lecture.short ?? "Unknown"}
- Number: ${lecture.number ?? "Unknown"}
- Classification key: ${formatClassificationLink(lecture.classificationKey, lecture.classificationPath, lecture.sourceUrl) ?? "Unknown"}
- Classification path: ${formatClassificationLink(lecture.classificationPath, lecture.classificationPath, lecture.sourceUrl) ?? "Unknown"}
- Source: [UnivIS](${lecture.sourceUrl})

## Organization

- Name: ${lecture.orgName ?? "Unknown"}
${lecture.orgUnits.map((unit) => `- ${unit}`).join("\n") || "- None"}

## Lecturers

${lecture.lecturerKeys.map((key) => `- ${formatLecturerLink(key, lecture.sourceUrl)}`).join("\n") || "- None"}

## Terms

${terms || "- None"}

## Additional XML Fields

${extraFieldLines || "- None"}
${renderHtmlDetail(detail)}
`;

    await writeFile(join(outputDir, `${filenameByKey.get(lecture.key) ?? lecture.slug}.md`), content);
  }

  const indexContent = `# XML Imported Courses

Generated ${sorted.length} XML-imported lecture file${sorted.length === 1 ? "" : "s"}.

${sorted.map((lecture) => `- [${lecture.title}](/courses/xml-import/${filenameByKey.get(lecture.key) ?? lecture.slug})`).join("\n")}
`;

  await writeFile(join(outputDir, "index.md"), indexContent);
}

function formatLecturerLink(personKey: string, lectureUrl: string): string {
  const url = new URL(lectureUrl);
  const personPath = personKey.replace(/^Person\./, "").replace(/\./g, "/");
  url.searchParams.set("dsc", "anew/tel_view");
  url.searchParams.set("pers", personPath);
  return `[${personKey}](${url.toString()})`;
}

function formatRoomLink(roomKey: string, lectureUrl: string): string {
  const url = new URL(lectureUrl);
  const roomPath = roomKey.replace(/^Room\./, "").replace(/\./g, "/");
  url.searchParams.set("dsc", "anew/room_view");
  url.searchParams.set("rooms", roomPath);
  return `[${roomKey}](${url.toString()})`;
}

function formatClassificationLink(label: string | undefined, classificationPath: string | undefined, lectureUrl: string): string | null {
  if (!label || !classificationPath) {
    return null;
  }

  const url = new URL(lectureUrl);
  url.searchParams.set("dsc", "anew/tlecture");
  url.searchParams.delete("lvs");
  url.searchParams.set("tdir", classificationPath);
  return `[${label}](${url.toString()})`;
}

function renderHtmlDetail(detail?: HtmlLectureDetail): string {
  if (!detail) {
    return "";
  }

  const lecturerBlock = detail.lecturers.length ? detail.lecturers.map((name) => `- ${name}`).join("\n") : "- None";
  const sectionBlocks = detail.sections
    .filter((section) => section.heading !== "Lecturer" && section.heading !== "Assigned lectures")
    .map((section) => `## ${section.heading}\n\n${section.content.split("\n").map((line) => `- ${line}`).join("\n")}`)
    .join("\n\n");
  const assignedBlock = detail.assignedLectures.length
    ? detail.assignedLectures
        .map((item) => {
          const lines = [
            `- ${[item.label, item.title].filter(Boolean).join(": ")}${item.number ? ` (${item.number})` : ""}`,
            item.detailUrl ? `- Detail: ${item.detailUrl}` : "",
            ...item.content.split("\n").map((line) => `- ${line}`)
          ].filter(Boolean);
          return lines.join("\n");
        })
        .join("\n")
    : "";
  const departmentBlock = detail.department
    ? `## Department\n\n- ${detail.department.label}\n- ${detail.department.sourceUrl}`
    : "";

  return `

## HTML Detail Lecturers

${lecturerBlock}
${sectionBlocks ? `\n\n${sectionBlocks}` : ""}${assignedBlock ? `\n\n## Assigned Lectures\n\n${assignedBlock}` : ""}${departmentBlock ? `\n\n${departmentBlock}` : ""}`;
}

function buildUniqueFilenames(lectures: XmlLectureRecord[]): Map<string, string> {
  const used = new Set<string>();
  const filenames = new Map<string, string>();

  for (const lecture of lectures) {
    let candidate = lecture.slug;
    let suffix = 1;

    while (used.has(candidate)) {
      candidate = `${lecture.slug}-${suffix}`;
      suffix += 1;
    }

    used.add(candidate);
    filenames.set(lecture.key, candidate);
  }

  return filenames;
}

async function clearGeneratedMarkdown(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }
    await rm(join(dir, entry.name), { force: true });
  }
}
