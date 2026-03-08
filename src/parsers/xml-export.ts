import * as cheerio from "cheerio";

export interface ParsedXmlExportPage {
  actionUrl: string;
  formData: Record<string, string>;
}

export function extractNodeXmlExportUrl(sourceUrl: string, html: string): string | undefined {
  const $ = cheerio.load(html);
  const href = $('a[href*="export to XML"], a[href*="dsc=anew/xml"], a[href*="dsc=anew/lecture:xml"]').filter((_, link) => {
    const text = cleanText($(link).text()).toLowerCase();
    return text === "export to xml" || /dsc=anew\/(xml|lecture:xml)/.test($(link).attr("href") ?? "");
  }).first().attr("href");

  return href ? new URL(href, sourceUrl).toString() : undefined;
}

export function parseXmlExportPage(sourceUrl: string, html: string): ParsedXmlExportPage {
  const $ = cheerio.load(html);
  const form = $("form").first();
  if (!form.length) {
    throw new Error("Could not find XML export form.");
  }

  const actionUrl = new URL(form.attr("action") ?? "/form", sourceUrl).toString();
  const formData: Record<string, string> = {};

  form.find('input[type="hidden"]').each((_, input) => {
    const name = $(input).attr("name");
    if (!name || name.startsWith("submitimg-")) {
      return;
    }
    formData[name] = $(input).attr("value") ?? "";
  });

  formData.level = "1";
  formData.option = "orgname";
  formData["done-anew/xml:doit"] = "to XML";

  return { actionUrl, formData };
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}
