/**
 * Script để rebuild polyline cho các routes
 * Usage: node scripts/rebuild-polyline.js [routeId]
 * - Nếu không có routeId: rebuild tất cả routes có stops
 * - Nếu có routeId: rebuild route cụ thể
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

// Import modules (using relative paths from scripts directory)
const RouteService = (await import("../src/services/RouteService.js")).default;
const MapsService = (await import("../src/services/MapsService.js")).default;
const TuyenDuongModel = (await import("../src/models/TuyenDuongModel.js")).default;
const RouteStopModel = (await import("../src/models/RouteStopModel.js")).default;
const { getCacheProvider } = await import("../src/core/cacheProvider.js");

async function rebuildPolylineForRoute(routeId) {
  try {
    console.log(`\n🔧 Rebuilding polyline for route ${routeId}...`);

    // Kiểm tra route có tồn tại không
    const route = await TuyenDuongModel.getById(routeId);
    if (!route) {
      console.error(`❌ Route ${routeId} not found`);
      return false;
    }

    // Kiểm tra route có stops không
    const stops = await RouteStopModel.getByRouteId(routeId);
    if (stops.length < 2) {
      console.warn(`⚠️ Route ${routeId} has less than 2 stops, skipping...`);
      return false;
    }

    // Rebuild polyline
    const result = await RouteService.rebuildPolyline(routeId, MapsService);

    console.log(`✅ Route ${routeId} polyline rebuilt successfully`);
    console.log(`   - Cached: ${result.cached}`);
    console.log(`   - Polyline length: ${result.polyline?.length || 0} characters`);

    return true;
  } catch (error) {
    console.error(`❌ Error rebuilding polyline for route ${routeId}:`, error.message);
    return false;
  }
}

async function rebuildAllRoutes() {
  try {
    console.log("🔍 Finding all routes with stops...");

    // Initialize cache provider
    await getCacheProvider();

    // Lấy tất cả routes
    const routes = await TuyenDuongModel.getAll();

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const route of routes) {
      const stops = await RouteStopModel.getByRouteId(route.maTuyen);
      if (stops.length < 2) {
        console.log(`⏭️ Skipping route ${route.maTuyen} (${route.tenTuyen}) - less than 2 stops`);
        skipCount++;
        continue;
      }

      const success = await rebuildPolylineForRoute(route.maTuyen);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Delay để tránh rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Skipped: ${skipCount}`);
    console.log(`   - Total: ${routes.length}`);
  } catch (error) {
    console.error("❌ Error rebuilding all routes:", error);
  }
}

async function main() {
  try {
    console.log("🚀 Starting polyline rebuild script...");

    // Get routeId from command line args
    const routeId = process.argv[2];

    if (routeId) {
      // Rebuild specific route
      await rebuildPolylineForRoute(parseInt(routeId));
    } else {
      // Rebuild all routes
      await rebuildAllRoutes();
    }

    console.log("\n✅ Script completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();
