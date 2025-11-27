/**
 * Script to export Postman collection from OpenAPI spec
 * Usage: node scripts/export-postman.js
 * 
 * Note: This script creates a basic Postman collection structure.
 * For full conversion, use online tools like:
 * - https://www.postman.com/openapi-to-postman/
 * - Or import openapi.yaml directly in Postman
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openApiPath = path.join(__dirname, "..", "docs", "openapi.yaml");
const outputPath = path.join(__dirname, "..", "docs", "postman_collection.json");

/**
 * Convert OpenAPI path to Postman request
 */
function convertPathToRequest(path, method, operation) {
  const request = {
    name: operation.summary || `${method.toUpperCase()} ${path}`,
    request: {
      method: method.toUpperCase(),
      header: [],
      url: {
        raw: "{{baseUrl}}" + path,
        host: ["{{baseUrl}}"],
        path: path.split("/").filter((p) => p && !p.startsWith("{")) || [],
      },
      description: operation.description || "",
    },
    response: [],
  };

  // Add path parameters
  if (operation.parameters) {
    operation.parameters.forEach((param) => {
      if (param.in === "path") {
        request.request.url.path.push(`:${param.name}`);
        request.request.url.raw = request.request.url.raw.replace(
          `{${param.name}}`,
          `:${param.name}`
        );
      } else if (param.in === "query") {
        if (!request.request.url.query) {
          request.request.url.query = [];
        }
        request.request.url.query.push({
          key: param.name,
          value: "",
          description: param.description || "",
        });
      }
    });
  }

  // Add request body
  if (operation.requestBody) {
    const content = operation.requestBody.content;
    if (content["application/json"]) {
      request.request.body = {
        mode: "raw",
        raw: JSON.stringify(
          content["application/json"].schema.example ||
            content["application/json"].example ||
            {},
          null,
          2
        ),
        options: {
          raw: {
            language: "json",
          },
        },
      };
      request.request.header.push({
        key: "Content-Type",
        value: "application/json",
      });
    }
  }

  // Add auth header
  request.request.header.push({
    key: "Authorization",
    value: "Bearer {{token}}",
    type: "text",
  });

  return request;
}

/**
 * Convert OpenAPI spec to Postman collection
 */
function convertToPostmanCollection(openApiSpec) {
  const collection = {
    info: {
      name: "Smart School Bus API v1.1",
      description: openApiSpec.info.description || "API collection for Smart School Bus Tracking System",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [],
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:4000/api/v1",
        type: "string",
      },
      {
        key: "token",
        value: "",
        type: "string",
      },
    ],
  };

  // Group by tags
  const tagMap = {};

  Object.entries(openApiSpec.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      if (method === "parameters") return;

      const tags = operation.tags || ["Default"];
      const tag = tags[0];

      if (!tagMap[tag]) {
        tagMap[tag] = {
          name: tag,
          item: [],
        };
      }

      const request = convertPathToRequest(path, method, operation);
      tagMap[tag].item.push(request);
    });
  });

  // Add grouped requests to collection
  Object.values(tagMap).forEach((group) => {
    collection.item.push(group);
  });

  return collection;
}

async function exportPostmanCollection() {
  try {
    console.log("📦 Reading OpenAPI spec...");
    const openApiContent = fs.readFileSync(openApiPath, "utf8");

    console.log("🔄 Converting to Postman collection...");
    const openApiSpec = yaml.load(openApiContent);

    const collection = convertToPostmanCollection(openApiSpec);

    console.log("💾 Saving Postman collection...");
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`✅ Postman collection exported to: ${outputPath}`);
    console.log(`   Collection name: ${collection.info.name}`);
    console.log(`   Groups: ${collection.item.length}`);
    console.log(
      `   Total requests: ${collection.item.reduce(
        (sum, group) => sum + group.item.length,
        0
      )}`
    );
    console.log("\n💡 Note: For full OpenAPI conversion, use Postman's built-in import");
    console.log("   or visit: https://www.postman.com/openapi-to-postman/");
  } catch (error) {
    console.error("❌ Error exporting Postman collection:", error);
    process.exit(1);
  }
}

exportPostmanCollection();
