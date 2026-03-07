import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { writeXmlLectureMarkdown } from "../src/generator/xml-markdown.js";
import { parseLectureDetailPage } from "../src/parsers/lecture-detail.js";
import { parseLectureExportXml } from "../src/parsers/lecture-xml.js";
import { readResponseText } from "../src/utils/http-text.js";
import { BASE_URL } from "../src/utils/url.js";

const rootDir = process.cwd();
const semester = process.argv[2] ?? "2025w";

async function main(): Promise<void> {
  const searchHtml = await submitSemesterSearch(semester);
  const exportUrl = extractExportUrl(searchHtml);
  const exportFormHtml = await fetchText(exportUrl);
  const formData = extractExportFormData(exportFormHtml);
  const xml = await submitXmlExport(formData);
  const lectures = parseLectureExportXml(xml);
  const detailByKey = await fetchLectureDetails(lectures);

  await mkdir(join(rootDir, "data", "raw", "xml"), { recursive: true });
  await mkdir(join(rootDir, "data", "normalized"), { recursive: true });
  await writeFile(join(rootDir, "data", "raw", "xml", `${semester}.xml`), xml);
  await writeFile(join(rootDir, "data", "normalized", `xml-lectures-${semester}.json`), JSON.stringify(lectures, null, 2));
  await writeFile(
    join(rootDir, "data", "normalized", `xml-lecture-details-${semester}.json`),
    JSON.stringify(Object.fromEntries(detailByKey.entries()), null, 2)
  );
  await writeXmlLectureMarkdown(rootDir, lectures, detailByKey);

  console.log(`Imported ${lectures.length} lectures from XML for ${semester}.`);
}

async function submitSemesterSearch(targetSemester: string): Promise<string> {
  const form = new URLSearchParams({
    "__s": "1",
    dsc: "anew/unihd",
    donedef: "1",
    search: "lecture",
    semto: targetSemester,
    setsem_jump: "anew/lecture_search",
    defaultto: "anew/lecture_search_xp:search",
    searchhow: "AND",
    "done-anew/search_xp:anew/lecture_search_xp:search": "Search!",
    allspec: "1",
    multi: "0",
    faculty_only: "0",
    ref: "tlecture",
    expert: "1",
    db_type: "Lecture",
    key_key: "lv",
    sem: targetSemester,
    lang: "en",
    return_tag: "anew/lecture_search",
    mode: "search",
    anonymous: "1",
    __e: "519"
  });

  return postForm(`${BASE_URL}/form`, form);
}

function extractExportUrl(html: string): string {
  const $ = cheerio.load(html);
  const href = $('a[href*="dsc=anew/xml"]').first().attr("href");
  if (!href) {
    throw new Error("Could not find XML export link in search results.");
  }
  return new URL(href, BASE_URL).toString();
}

function extractExportFormData(html: string): URLSearchParams {
  const $ = cheerio.load(html);
  const params = new URLSearchParams();

  $('input[type="hidden"]').each((_, input) => {
    const name = $(input).attr("name");
    const value = $(input).attr("value") ?? "";
    if (name) {
      params.set(name, value);
    }
  });

  params.set("level", "3");
  params.set("option", "orgname");
  params.set("done-anew/xml:doit", "to XML");
  return params;
}

async function submitXmlExport(formData: URLSearchParams): Promise<string> {
  const response = await postForm(`${BASE_URL}/form`, formData);
  if (!response.trimStart().startsWith("<?xml")) {
    throw new Error("XML export did not return XML.");
  }
  return response;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }
  return readResponseText(response);
}

async function postForm(url: string, body: URLSearchParams): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }

  return readResponseText(response);
}

async function fetchLectureDetails(lectures: ReturnType<typeof parseLectureExportXml>): Promise<Map<string, ReturnType<typeof parseLectureDetailPage>>> {
  const results = new Map<string, ReturnType<typeof parseLectureDetailPage>>();
  const concurrency = Number.parseInt(process.env.UNIVIS_HTML_CONCURRENCY ?? "8", 10);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < lectures.length) {
      const current = lectures[index];
      index += 1;
      if (!current) {
        continue;
      }

      try {
        const html = await fetchText(current.sourceUrl);
        results.set(current.key, parseLectureDetailPage(current.sourceUrl, html));
      } catch (error) {
        console.warn(`Failed to fetch detail for ${current.key}:`, error);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
