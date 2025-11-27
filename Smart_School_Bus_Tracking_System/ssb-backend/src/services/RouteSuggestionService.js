import pool from "../config/db.js";
import HocSinhModel from "../models/HocSinhModel.js";
import TuyenDuongModel from "../models/TuyenDuongModel.js";
import MapsService from "./MapsService.js";
import StopSuggestionService from "./StopSuggestionService.js";

/**
 * Service để đề xuất tuyến đường hoàn chỉnh dựa trên học sinh
 */
class RouteSuggestionService {
  // Vị trí Đại học Sài Gòn (SGU) - điểm cuối mặc định
  static SGU_LOCATION = {
    lat: 10.7602396,
    lng: 106.6807235,
    address: "Đại học Sài Gòn, 273 An Dương Vương, Phường 3, Quận 5, TP.HCM"
  };

  /**
   * Tính bearing (hướng) từ điểm A đến điểm B (0-360 độ)
   * 0° = Bắc, 90° = Đông, 180° = Nam, 270° = Tây
   */
  static calculateBearing(lat1, lng1, lat2, lng2) {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360; // Normalize to 0-360
  }

  /**
   * Xác định hướng (8 hướng) từ bearing
   */
  static getDirectionFromBearing(bearing) {
    // Chuẩn hóa bearing về 0-360
    const normalizedBearing = ((bearing % 360) + 360) % 360;
    
    // 8 hướng, mỗi hướng 45 độ
    // Bắc: 337.5-22.5 (hoặc -22.5-22.5)
    // Đông Bắc: 22.5-67.5
    // Đông: 67.5-112.5
    // Đông Nam: 112.5-157.5
    // Nam: 157.5-202.5
    // Tây Nam: 202.5-247.5
    // Tây: 247.5-292.5
    // Tây Bắc: 292.5-337.5
    
    if (normalizedBearing >= 337.5 || normalizedBearing < 22.5) {
      return 'Bắc';
    } else if (normalizedBearing >= 22.5 && normalizedBearing < 67.5) {
      return 'Đông Bắc';
    } else if (normalizedBearing >= 67.5 && normalizedBearing < 112.5) {
      return 'Đông';
    } else if (normalizedBearing >= 112.5 && normalizedBearing < 157.5) {
      return 'Đông Nam';
    } else if (normalizedBearing >= 157.5 && normalizedBearing < 202.5) {
      return 'Nam';
    } else if (normalizedBearing >= 202.5 && normalizedBearing < 247.5) {
      return 'Tây Nam';
    } else if (normalizedBearing >= 247.5 && normalizedBearing < 292.5) {
      return 'Tây';
    } else {
      return 'Tây Bắc';
    }
  }

  /**
   * Extract quận/huyện từ địa chỉ học sinh
   */
  static extractDistrict(address) {
    if (!address) return null;
    
    const addressLower = address.toLowerCase();
    
    // Danh sách các quận/huyện TP.HCM
    const districts = [
      'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8',
      'quận 9', 'quận 10', 'quận 11', 'quận 12', 'quận bình tân', 'quận bình thạnh',
      'quận gò vấp', 'quận phú nhuận', 'quận tân bình', 'quận tân phú', 'quận thủ đức',
      'huyện bình chánh', 'huyện cần giờ', 'huyện củ chi', 'huyện hóc môn',
      'huyện nhà bè', 'huyện cần giờ'
    ];
    
    for (const district of districts) {
      if (addressLower.includes(district)) {
        // Chuẩn hóa tên quận
        if (district.includes('quận')) {
          return district.replace('quận', '').trim();
        } else if (district.includes('huyện')) {
          return district.replace('huyện', '').trim();
        }
        return district;
      }
    }
    
    return null;
  }

  /**
   * Đề xuất các tuyến đường hoàn chỉnh dựa trên học sinh trong khu vực
   * 
   * @param {Object} options - Các tùy chọn
   * @param {string} options.area - Khu vực (quận/huyện) để filter học sinh
   * @param {number} options.maxStudentsPerRoute - Số học sinh tối đa mỗi tuyến (mặc định: 35)
   * @param {number} options.minStudentsPerRoute - Số học sinh tối thiểu mỗi tuyến (mặc định: 30)
   * @param {number} options.maxStopsPerRoute - Số điểm dừng tối đa mỗi tuyến (mặc định: 35)
   * @param {number} options.maxDistanceKm - Khoảng cách tối đa để clustering (mặc định: 1.5 km)
   * @param {number} options.minStudentsPerStop - Số học sinh tối thiểu mỗi điểm dừng (mặc định: 1)
   * @param {boolean} options.geocodeAddresses - Có geocode địa chỉ không (mặc định: true)
   * @param {Object} options.schoolLocation - Vị trí trường học {lat, lng} hoặc null để dùng SGU
   * @param {boolean} options.createReturnRoutes - Tạo tuyến về tương ứng (mặc định: true)
   * @returns {Promise<Object>} Danh sách tuyến đường đề xuất (đi và về)
   */
  static async suggestRoutes(options = {}) {
    const {
      area = null,
      maxStudentsPerRoute = 35, // Mỗi tuyến tối đa 35 học sinh (trong khoảng 30-40)
      minStudentsPerRoute = 30, // Mỗi tuyến tối thiểu 30 học sinh
      maxStopsPerRoute = 35, // Tối đa 35 điểm dừng (dưới 40)
      maxDistanceKm = 1.5, // Giảm khoảng cách clustering để gom học sinh gần nhau hơn
      minStudentsPerStop = 1,
      geocodeAddresses = true,
      schoolLocation = null, // Vị trí trường học (điểm đến), null = dùng SGU
      createReturnRoutes = true, // Tạo tuyến về tương ứng
    } = options;

    try {
      // 1. Lấy tất cả học sinh
      let students = await HocSinhModel.getAll();

      // Filter theo khu vực nếu có
      if (area) {
        students = students.filter((s) =>
          s.diaChi && s.diaChi.toLowerCase().includes(area.toLowerCase())
        );
      }

      if (students.length === 0) {
        return {
          routes: [],
          returnRoutes: [],
          message: "Không tìm thấy học sinh trong khu vực này",
        };
      }

      console.log(`[RouteSuggestion] Found ${students.length} students${area ? ` in area: ${area}` : ''}`);

      // 2. Geocode địa chỉ học sinh nếu cần
      if (geocodeAddresses) {
        console.log(`[RouteSuggestion] Enriching coordinates for ${students.length} students...`);
        students = await StopSuggestionService.enrichStudentCoordinates(students, 2); // Retry 2 lần
      }

      // 3. Tách học sinh thành 2 nhóm: có tọa độ và không có tọa độ
      const studentsWithCoords = students.filter(
        s => s.viDo && s.kinhDo && !isNaN(s.viDo) && !isNaN(s.kinhDo) && !s.missingCoords
      );
      const studentsWithoutCoords = students.filter(
        s => s.missingCoords === true || !s.viDo || !s.kinhDo || isNaN(s.viDo) || isNaN(s.kinhDo)
      );

      console.log(`[RouteSuggestion] ${studentsWithCoords.length}/${students.length} students have coordinates`);
      if (studentsWithoutCoords.length > 0) {
        console.warn(`[RouteSuggestion] ⚠️ ${studentsWithoutCoords.length} students missing coordinates will be unassigned`);
      }

      // 4. Xác định vị trí trường học (destination) - mặc định là SGU
      let destination = schoolLocation || this.SGU_LOCATION;
      if (!destination.lat || !destination.lng) {
        destination = this.SGU_LOCATION;
      }

      console.log(`[RouteSuggestion] Destination (school):`, destination);

      // 5. Phân chia học sinh có tọa độ theo 8 hướng từ SGU
      const studentsByDirection = {};
      
      studentsWithCoords.forEach(student => {
        // Tính bearing từ SGU đến học sinh
        const bearing = this.calculateBearing(
          destination.lat, destination.lng,
          student.viDo, student.kinhDo
        );
        
        // Xác định hướng (8 hướng)
        const direction = this.getDirectionFromBearing(bearing);
        
        if (!studentsByDirection[direction]) {
          studentsByDirection[direction] = [];
        }
        
        studentsByDirection[direction].push({
          ...student,
          bearing,
          distance: StopSuggestionService.calculateDistance(
            destination.lat, destination.lng,
            student.viDo, student.kinhDo
          )
        });
      });

      console.log(`[RouteSuggestion] Students by direction:`, Object.keys(studentsByDirection).map(d => ({
        direction: d,
        count: studentsByDirection[d].length
      })));

      // 5. Tạo tuyến đường cho mỗi hướng
      const allRoutes = [];
      
      for (const [direction, directionStudents] of Object.entries(studentsByDirection)) {
        if (directionStudents.length === 0) continue;

        console.log(`[RouteSuggestion] Processing direction: ${direction} with ${directionStudents.length} students`);

        // Clustering học sinh trong hướng (gom địa chỉ gần nhau thành điểm dừng)
        const clusters = StopSuggestionService.clusterStudents(directionStudents, maxDistanceKm);
        console.log(`[RouteSuggestion] Created ${clusters.length} clusters for ${direction}`);

        // Tính điểm trung tâm cho mỗi cluster (điểm dừng)
        const stopCandidates = clusters
          .filter((c) => c.length >= minStudentsPerStop)
          .map((cluster) => {
            const center = StopSuggestionService.calculateClusterCenter(cluster);
            const distance = StopSuggestionService.calculateDistance(
              destination.lat, destination.lng,
              center.lat, center.lng
            );
            return {
              lat: center.lat,
              lng: center.lng,
              address: center.address || StopSuggestionService.generateStopName(cluster),
              studentCount: center.studentCount,
              students: center.students,
              direction: direction,
              distance: distance, // Khoảng cách đến SGU
            };
          })
          .filter((stop) => stop.lat && stop.lng);

        if (stopCandidates.length === 0) {
          console.warn(`[RouteSuggestion] No valid stops for direction: ${direction}`);
          continue;
        }

        // Sắp xếp điểm dừng từ xa đến gần SGU (để tuyến bắt đầu từ điểm xa nhất)
        stopCandidates.sort((a, b) => b.distance - a.distance);

        // Phân chia thành các tuyến (mỗi tuyến 30-40 học sinh)
        const routesForDirection = await this.createRoutesForDirection(
          stopCandidates,
          destination,
          direction,
          maxStudentsPerRoute,
          minStudentsPerRoute,
          maxStopsPerRoute
        );

        allRoutes.push(...routesForDirection);
      }

      // 6. Tạo tuyến về tương ứng (nếu yêu cầu)
      const returnRoutes = [];
      if (createReturnRoutes) {
        for (const route of allRoutes) {
          const returnRoute = this.createReturnRoute(route, destination);
          if (returnRoute) {
            returnRoutes.push(returnRoute);
          }
        }
      }

      console.log(`[RouteSuggestion] Created ${allRoutes.length} routes (đi) and ${returnRoutes.length} routes (về)`);

      return {
        routes: allRoutes,
        returnRoutes: returnRoutes,
        totalStudents: students.length,
        assignedStudents: studentsWithCoords.length,
        unassignedStudents: studentsWithoutCoords.map(s => ({
          maHocSinh: s.maHocSinh,
          hoTen: s.hoTen,
          diaChi: s.diaChi,
          missingCoords: true,
          reason: s.diaChi ? 'Geocoding failed' : 'No address provided',
        })),
        destination: destination,
        directions: Object.keys(studentsByDirection),
      };
    } catch (error) {
      console.error("Error in RouteSuggestionService.suggestRoutes:", error);
      throw error;
    }
  }

  /**
   * Validate tuyến đường trước khi tạo
   */
  static validateRouteConstraints(route, minStudents, maxStudents) {
    const errors = [];
    
    if (route.totalStudents < minStudents) {
      errors.push(`Số học sinh (${route.totalStudents}) nhỏ hơn tối thiểu (${minStudents})`);
    }
    
    if (route.totalStudents > maxStudents) {
      errors.push(`Số học sinh (${route.totalStudents}) vượt quá tối đa (${maxStudents})`);
    }
    
    if (route.stops.length < 2) {
      errors.push(`Tuyến phải có ít nhất 2 điểm dừng (hiện tại: ${route.stops.length})`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Tạo các tuyến đường cho một hướng, phân chia theo số học sinh (MIN-MAX mỗi tuyến)
   * Hướng nhiều học sinh sẽ tự động tạo nhiều tuyến hơn
   */
  static async createRoutesForDirection(stopCandidates, destination, direction, maxStudents, minStudents, maxStops) {
    const routes = [];
    
    // Tính tổng số học sinh trong hướng
    const totalStudentsInDirection = stopCandidates.reduce((sum, stop) => sum + (stop.studentCount || 0), 0);
    
    // Ước tính số tuyến cần thiết
    const estimatedRoutes = Math.ceil(totalStudentsInDirection / maxStudents);
    console.log(`[RouteSuggestion] Direction ${direction}: ${totalStudentsInDirection} students, estimated ${estimatedRoutes} routes`);

    // Stops đã được sắp xếp từ xa đến gần SGU (trong suggestRoutes)
    const sortedStops = [...stopCandidates]; // Copy để không ảnh hưởng original

    let currentRouteStops = [];
    let currentRouteStudents = 0;
    let routeIndex = 1;

    for (let i = 0; i < sortedStops.length; i++) {
      const stop = sortedStops[i];
      const nextStop = sortedStops[i + 1];
      
      const wouldExceedStudents = currentRouteStudents + stop.studentCount > maxStudents;
      const wouldExceedStops = currentRouteStops.length >= maxStops;
      
      // Nếu thêm stop này sẽ vượt quá giới hạn, tạo tuyến mới
      if ((wouldExceedStudents || wouldExceedStops) && currentRouteStops.length > 0) {
        // Kiểm tra xem tuyến hiện tại có đủ học sinh tối thiểu không
        // Nếu chưa đủ và có thể thêm stop này mà không vượt quá max quá nhiều, thêm vào
        if (currentRouteStudents < minStudents && !wouldExceedStops && currentRouteStudents + stop.studentCount <= maxStudents + 5) {
          // Cho phép vượt một chút để đạt minStudents
          currentRouteStops.push(stop);
          currentRouteStudents += stop.studentCount;
          continue;
        }
        
        // Chỉ tạo tuyến nếu có ít nhất 1 stop (sẽ được thêm destination trong createRouteFromStops)
        if (currentRouteStops.length === 0) {
          continue;
        }

        // Tạo tuyến từ các stops hiện tại
        const route = await this.createRouteFromStops(
          currentRouteStops,
          destination,
          direction,
          routeIndex
        );
        
        if (route) {
          // Validate tuyến trước khi thêm - đảm bảo có ít nhất 2 stops
          if (route.stops.length < 2) {
            console.warn(`[RouteSuggestion] Route ${routeIndex} has only ${route.stops.length} stop(s), skipping`);
            continue;
          }

          const validation = this.validateRouteConstraints(route, minStudents, maxStudents);
          if (validation.valid) {
            routes.push(route);
            console.log(`[RouteSuggestion] Created route ${routeIndex} for ${direction}: ${route.totalStudents} students, ${route.stops.length} stops`);
          } else {
            console.warn(`[RouteSuggestion] Route ${routeIndex} validation failed:`, validation.errors);
            // Vẫn thêm vào nhưng đánh dấu warning
            route.validationWarnings = validation.errors;
            routes.push(route);
          }
        }
        
        // Reset cho tuyến mới
        currentRouteStops = [];
        currentRouteStudents = 0;
        routeIndex++;
      }

      // Thêm stop vào tuyến hiện tại
      currentRouteStops.push(stop);
      currentRouteStudents += stop.studentCount;

      // Nếu đã đủ số học sinh tối thiểu và đã có đủ stops, kiểm tra xem có nên tạo tuyến ngay không
      if (currentRouteStudents >= minStudents && currentRouteStops.length >= 2) {
        // Nếu không còn stop nào, tạo tuyến ngay
        if (!nextStop) {
          if (currentRouteStops.length > 0) {
            const route = await this.createRouteFromStops(
              currentRouteStops,
              destination,
              direction,
              routeIndex
            );
            if (route && route.stops.length >= 2) {
              const validation = this.validateRouteConstraints(route, minStudents, maxStudents);
              if (validation.valid) {
                routes.push(route);
                console.log(`[RouteSuggestion] Created final route ${routeIndex} for ${direction}: ${route.totalStudents} students, ${route.stops.length} stops`);
              } else {
                console.warn(`[RouteSuggestion] Final route ${routeIndex} validation failed:`, validation.errors);
                route.validationWarnings = validation.errors;
                routes.push(route);
              }
            }
          }
          
          currentRouteStops = [];
          currentRouteStudents = 0;
          routeIndex++;
        } else if (currentRouteStudents + nextStop.studentCount > maxStudents) {
          // Stop tiếp theo sẽ làm vượt quá, tạo tuyến hiện tại
          if (currentRouteStops.length > 0) {
            const route = await this.createRouteFromStops(
              currentRouteStops,
              destination,
              direction,
              routeIndex
            );
            if (route && route.stops.length >= 2) {
              const validation = this.validateRouteConstraints(route, minStudents, maxStudents);
              if (validation.valid) {
                routes.push(route);
                console.log(`[RouteSuggestion] Created route ${routeIndex} for ${direction}: ${route.totalStudents} students, ${route.stops.length} stops`);
              } else {
                console.warn(`[RouteSuggestion] Route ${routeIndex} validation failed:`, validation.errors);
                route.validationWarnings = validation.errors;
                routes.push(route);
              }
            }
          }
          
          currentRouteStops = [];
          currentRouteStudents = 0;
          routeIndex++;
        }
      }
    }

    // Tạo tuyến cuối cùng nếu còn stops
    if (currentRouteStops.length > 0) {
      const route = await this.createRouteFromStops(
        currentRouteStops,
        destination,
        direction,
        routeIndex
      );
      if (route && route.stops.length >= 2) {
        const validation = this.validateRouteConstraints(route, minStudents, maxStudents);
        
        // Nếu tuyến cuối < MIN, thử merge với tuyến trước (nếu có)
        if (!validation.valid && validation.errors.some(e => e.includes('nhỏ hơn tối thiểu')) && routes.length > 0) {
          const lastRoute = routes[routes.length - 1];
          const combinedStudents = lastRoute.totalStudents + route.totalStudents;
          
          // Nếu merge không vượt quá MAX, merge lại
          if (combinedStudents <= maxStudents) {
            console.log(`[RouteSuggestion] Merging last route (${route.totalStudents} students) with previous route (${lastRoute.totalStudents} students)`);
            // Xóa tuyến cuối và merge stops vào tuyến trước
            routes.pop();
            // Lấy stop candidates từ routes (bỏ origin/destination đã được thêm)
            const lastRouteStops = lastRoute.stops.filter((s) => {
              const distToDest = StopSuggestionService.calculateDistance(
                s.lat, s.lng, destination.lat, destination.lng
              );
              return distToDest > 0.01; // Bỏ destination nếu có
            });
            const currentRouteStops = route.stops.filter((s) => {
              const distToDest = StopSuggestionService.calculateDistance(
                s.lat, s.lng, destination.lat, destination.lng
              );
              return distToDest > 0.01; // Bỏ destination nếu có
            });
            const mergedStopCandidates = [...lastRouteStops, ...currentRouteStops];
            const mergedRoute = await this.createRouteFromStops(
              mergedStopCandidates,
              destination,
              direction,
              routeIndex - 1
            );
            if (mergedRoute && mergedRoute.stops.length >= 2) {
              const mergedValidation = this.validateRouteConstraints(mergedRoute, minStudents, maxStudents);
              if (mergedValidation.valid) {
                routes.push(mergedRoute);
                console.log(`[RouteSuggestion] Merged route: ${mergedRoute.totalStudents} students, ${mergedRoute.stops.length} stops`);
              } else {
                console.warn(`[RouteSuggestion] Merged route validation failed:`, mergedValidation.errors);
                mergedRoute.validationWarnings = mergedValidation.errors;
                routes.push(mergedRoute);
              }
            }
          } else {
            // Không thể merge, thêm tuyến cuối với warning
            route.validationWarnings = validation.errors;
            routes.push(route);
            console.warn(`[RouteSuggestion] Final route ${routeIndex} has ${route.totalStudents} students (< ${minStudents}), cannot merge`);
          }
        } else {
          // Validation OK hoặc không thể merge
          if (validation.valid) {
            routes.push(route);
            console.log(`[RouteSuggestion] Created final route ${routeIndex} for ${direction}: ${route.totalStudents} students, ${route.stops.length} stops`);
          } else {
            route.validationWarnings = validation.errors;
            routes.push(route);
            console.warn(`[RouteSuggestion] Final route ${routeIndex} validation failed:`, validation.errors);
          }
        }
      } else if (route && route.stops.length < 2) {
        console.warn(`[RouteSuggestion] Final route ${routeIndex} has only ${route.stops.length} stop(s), skipping`);
      }
    }

    console.log(`[RouteSuggestion] Direction ${direction}: Created ${routes.length} routes total`);
    return routes;
  }

  /**
   * Tạo một tuyến đường từ danh sách stops
   * Stops đã được sắp xếp từ xa đến gần SGU
   * Đảm bảo tuyến có ít nhất 2 điểm dừng (origin + stops + destination)
   */
  static async createRouteFromStops(stops, destination, direction, routeIndex) {
    if (!stops || stops.length === 0) return null;

    try {
      // Origin là điểm xa nhất từ destination (điểm đầu tiên trong danh sách đã sort)
      const origin = stops[0];

      // Sắp xếp stops từ xa đến gần SGU (đã sort rồi, nhưng cần đảm bảo)
      const sortedStops = [...stops].sort((a, b) => {
        const distA = a.distance || StopSuggestionService.calculateDistance(
          a.lat, a.lng, destination.lat, destination.lng
        );
        const distB = b.distance || StopSuggestionService.calculateDistance(
          b.lat, b.lng, destination.lat, destination.lng
        );
        return distB - distA; // Xa nhất trước
      });

      // Tối ưu thứ tự stops từ origin về destination
      const optimizedStops = await this.optimizeStopOrder(sortedStops, origin, destination);

      // Đảm bảo tuyến có ít nhất 2 điểm dừng THẬT (từ clustering)
      // KHÔNG tự động thêm destination vào stops nếu chỉ có 1 stop
      // Vì destination cần được tạo như một stop thật trong DB để hiển thị trên bản đồ
      const finalStops = [...optimizedStops];
      
      // Kiểm tra xem destination đã có trong stops chưa (so sánh tọa độ)
      const destinationInStops = finalStops.some(stop => {
        const dist = StopSuggestionService.calculateDistance(
          stop.lat, stop.lng, destination.lat, destination.lng
        );
        return dist < 0.01; // < 10m thì coi như cùng một điểm
      });

      // Nếu destination chưa có trong stops, thêm destination như một stop thật (sẽ được tạo trong DB)
      // Điều này đảm bảo route có điểm bắt đầu và điểm kết thúc rõ ràng
      if (!destinationInStops) {
        finalStops.push({
          lat: destination.lat,
          lng: destination.lng,
          address: destination.address || "Đại học Sài Gòn",
          studentCount: 0,
          students: [],
          distance: 0,
          isDestination: true, // Đánh dấu đây là destination để xử lý đặc biệt nếu cần
        });
      }

      // Nếu vẫn chỉ có 1 stop (sau khi thêm destination), không tạo tuyến (return null)
      // Vì route cần ít nhất 1 stop thật (từ clustering) + destination
      if (finalStops.length < 2) {
        console.warn(`[RouteSuggestion] Route ${direction} - #${routeIndex} has only ${finalStops.length} stop(s), skipping`);
        return null;
      }

      // Tính tổng số học sinh
      const totalStudents = finalStops.reduce(
        (sum, stop) => sum + (stop.studentCount || 0),
        0
      );

      // Tính thời gian và khoảng cách
      const estimatedTime = await this.estimateRouteTime(origin, destination, finalStops);
      const totalDistance = await this.calculateRouteDistance(origin, destination, finalStops);

      // Generate unique name với timestamp để tránh duplicate
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      const uniqueSuffix = `${timestamp}_${timeStr}`;
      
      return {
        name: `Tuyến ${direction} - #${routeIndex} (Đi) - ${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`,
        direction: direction,
        routeType: 'di',
        origin: {
          lat: origin.lat,
          lng: origin.lng,
          address: origin.address || "Điểm xuất phát",
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          address: destination.address || "Đại học Sài Gòn",
        },
        stops: finalStops.map((stop, index) => ({
          sequence: index + 1,
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address,
          tenDiem: stop.tenDiem || stop.address || `Điểm dừng ${index + 1}`, // Đảm bảo có tenDiem để lưu vào DB
          studentCount: stop.studentCount || 0,
          students: stop.students || [],
        })),
        totalStudents: totalStudents,
        estimatedTimeMinutes: estimatedTime,
        totalDistanceKm: totalDistance,
      };
    } catch (error) {
      console.error(`[RouteSuggestion] Error creating route from stops:`, error);
      return null;
    }
  }

  /**
   * Tạo tuyến về tương ứng với tuyến đi (ngược lại)
   */
  static createReturnRoute(route, schoolLocation) {
    if (!route || !route.stops || route.stops.length === 0) return null;

    try {
      // Đảo ngược thứ tự stops
      const reversedStops = [...route.stops].reverse().map((stop, index) => ({
        ...stop,
        sequence: index + 1,
      }));

      // Origin là trường học (SGU), destination là điểm cuối của tuyến đi
      const origin = schoolLocation || this.SGU_LOCATION;
      const destination = route.origin;

      // Generate unique name cho tuyến về
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
      
      return {
        name: route.name.replace('(Đi)', '(Về)'),
        direction: route.direction,
        routeType: 've',
        origin: {
          lat: origin.lat,
          lng: origin.lng,
          address: origin.address || "Đại học Sài Gòn",
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          address: destination.address || "Điểm kết thúc",
        },
        stops: reversedStops,
        totalStudents: route.totalStudents,
        estimatedTimeMinutes: route.estimatedTimeMinutes,
        totalDistanceKm: route.totalDistanceKm,
        pairedRouteId: null, // Sẽ được set khi tạo trong database
      };
    } catch (error) {
      console.error(`[RouteSuggestion] Error creating return route:`, error);
      return null;
    }
  }

  /**
   * Detect vị trí trường học từ địa chỉ học sinh
   */
  static detectSchoolLocation(students) {
    // Tìm từ khóa "trường", "school" trong địa chỉ
    const schoolKeywords = ["trường", "school", "thcs", "thpt", "tiểu học"];
    
    for (const student of students) {
      if (student.diaChi) {
        const lowerAddress = student.diaChi.toLowerCase();
        const hasSchoolKeyword = schoolKeywords.some(kw => lowerAddress.includes(kw));
        
        if (hasSchoolKeyword && student.viDo && student.kinhDo) {
          return {
            lat: student.viDo,
            lng: student.kinhDo,
            address: student.diaChi,
            source: "student_address",
          };
        }
      }
    }

    // Nếu không tìm thấy, trả về null để dùng điểm trung tâm
    return null;
  }

  /**
   * Tính điểm trung tâm của tất cả học sinh
   */
  static calculateStudentCenter(students) {
    const studentsWithCoords = students.filter(
      (s) => s.viDo && s.kinhDo && !isNaN(s.viDo) && !isNaN(s.kinhDo)
    );

    if (studentsWithCoords.length === 0) {
      return null;
    }

    const avgLat =
      studentsWithCoords.reduce((sum, s) => sum + s.viDo, 0) /
      studentsWithCoords.length;
    const avgLng =
      studentsWithCoords.reduce((sum, s) => sum + s.kinhDo, 0) /
      studentsWithCoords.length;

    return {
      lat: avgLat,
      lng: avgLng,
      address: "Điểm trung tâm học sinh",
      source: "student_center",
    };
  }

  /**
   * Tạo tuyến đường tối ưu (ngắn nhất)
   */
  static async generateOptimizedRoute(stopCandidates, destination, maxStops, routeName) {
    try {
      // Sắp xếp stops theo khoảng cách đến destination (gần nhất trước)
      const sortedStops = [...stopCandidates].sort((a, b) => {
        const distA = StopSuggestionService.calculateDistance(
          a.lat, a.lng, destination.lat, destination.lng
        );
        const distB = StopSuggestionService.calculateDistance(
          b.lat, b.lng, destination.lat, destination.lng
        );
        return distA - distB;
      });

      // Lấy maxStops stops gần nhất
      const selectedStops = sortedStops.slice(0, maxStops);

      // Tìm origin (điểm xa nhất từ destination)
      const origin = selectedStops.length > 0
        ? selectedStops.reduce((farthest, stop) => {
            const dist = StopSuggestionService.calculateDistance(
              stop.lat, stop.lng, destination.lat, destination.lng
            );
            const farthestDist = StopSuggestionService.calculateDistance(
              farthest.lat, farthest.lng, destination.lat, destination.lng
            );
            return dist > farthestDist ? stop : farthest;
          })
        : null;

      if (!origin || selectedStops.length === 0) {
        return null;
      }

      // Tối ưu thứ tự stops từ origin → destination
      const optimizedStops = await this.optimizeStopOrder(
        selectedStops,
        origin,
        destination
      );

      // Tính tổng số học sinh
      const totalStudents = optimizedStops.reduce(
        (sum, stop) => sum + (stop.studentCount || 0),
        0
      );

      // Tính thời gian ước tính (dựa trên khoảng cách và số điểm dừng)
      const estimatedTime = await this.estimateRouteTime(
        origin,
        destination,
        optimizedStops
      );

      return {
        name: routeName,
        origin: {
          lat: origin.lat,
          lng: origin.lng,
          address: origin.address || "Điểm xuất phát",
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          address: destination.address || "Trường học",
        },
        stops: optimizedStops.map((stop, index) => ({
          sequence: index + 1,
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address,
          studentCount: stop.studentCount || 0,
          students: stop.students || [],
        })),
        totalStudents: totalStudents,
        estimatedTimeMinutes: estimatedTime,
        totalDistanceKm: await this.calculateRouteDistance(origin, destination, optimizedStops),
      };
    } catch (error) {
      console.error(`[RouteSuggestion] Error generating optimized route:`, error);
      return null;
    }
  }

  /**
   * Tạo tuyến đường đi qua nhiều học sinh nhất
   */
  static async generateMaxStudentsRoute(stopCandidates, destination, maxStops, routeName) {
    try {
      // Sắp xếp theo số lượng học sinh (giảm dần)
      const sortedStops = [...stopCandidates].sort(
        (a, b) => (b.studentCount || 0) - (a.studentCount || 0)
      );

      // Lấy top stops có nhiều học sinh nhất
      const selectedStops = sortedStops.slice(0, maxStops);

      if (selectedStops.length === 0) {
        return null;
      }

      // Origin là điểm xa nhất từ destination
      const origin = selectedStops.reduce((farthest, stop) => {
        const dist = StopSuggestionService.calculateDistance(
          stop.lat, stop.lng, destination.lat, destination.lng
        );
        const farthestDist = StopSuggestionService.calculateDistance(
          farthest.lat, farthest.lng, destination.lat, destination.lng
        );
        return dist > farthestDist ? stop : farthest;
      });

      // Tối ưu thứ tự
      const optimizedStops = await this.optimizeStopOrder(
        selectedStops,
        origin,
        destination
      );

      const totalStudents = optimizedStops.reduce(
        (sum, stop) => sum + (stop.studentCount || 0),
        0
      );

      const estimatedTime = await this.estimateRouteTime(
        origin,
        destination,
        optimizedStops
      );

      return {
        name: routeName,
        origin: {
          lat: origin.lat,
          lng: origin.lng,
          address: origin.address || "Điểm xuất phát",
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          address: destination.address || "Trường học",
        },
        stops: optimizedStops.map((stop, index) => ({
          sequence: index + 1,
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address,
          studentCount: stop.studentCount || 0,
          students: stop.students || [],
        })),
        totalStudents: totalStudents,
        estimatedTimeMinutes: estimatedTime,
        totalDistanceKm: await this.calculateRouteDistance(origin, destination, optimizedStops),
      };
    } catch (error) {
      console.error(`[RouteSuggestion] Error generating max students route:`, error);
      return null;
    }
  }

  /**
   * Tạo tuyến đường cân bằng (số học sinh và khoảng cách)
   */
  static async generateBalancedRoute(stopCandidates, destination, maxStops, routeName) {
    try {
      // Tính điểm số cho mỗi stop: (studentCount * weight) / distance
      const scoredStops = stopCandidates.map((stop) => {
        const distance = StopSuggestionService.calculateDistance(
          stop.lat, stop.lng, destination.lat, destination.lng
        );
        const studentScore = stop.studentCount || 0;
        const distanceScore = distance > 0 ? 1 / distance : 0;
        const balanceScore = studentScore * 0.7 + distanceScore * 0.3; // Ưu tiên học sinh hơn

        return {
          ...stop,
          balanceScore,
          distance,
        };
      });

      // Sắp xếp theo điểm số cân bằng
      scoredStops.sort((a, b) => b.balanceScore - a.balanceScore);

      // Lấy top stops
      const selectedStops = scoredStops.slice(0, maxStops).map(s => {
        const { balanceScore, distance, ...rest } = s;
        return rest;
      });

      if (selectedStops.length === 0) {
        return null;
      }

      // Origin là điểm xa nhất
      const origin = selectedStops.reduce((farthest, stop) => {
        const dist = StopSuggestionService.calculateDistance(
          stop.lat, stop.lng, destination.lat, destination.lng
        );
        const farthestDist = StopSuggestionService.calculateDistance(
          farthest.lat, farthest.lng, destination.lat, destination.lng
        );
        return dist > farthestDist ? stop : farthest;
      });

      // Tối ưu thứ tự
      const optimizedStops = await this.optimizeStopOrder(
        selectedStops,
        origin,
        destination
      );

      const totalStudents = optimizedStops.reduce(
        (sum, stop) => sum + (stop.studentCount || 0),
        0
      );

      const estimatedTime = await this.estimateRouteTime(
        origin,
        destination,
        optimizedStops
      );

      return {
        name: routeName,
        origin: {
          lat: origin.lat,
          lng: origin.lng,
          address: origin.address || "Điểm xuất phát",
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          address: destination.address || "Trường học",
        },
        stops: optimizedStops.map((stop, index) => ({
          sequence: index + 1,
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address,
          studentCount: stop.studentCount || 0,
          students: stop.students || [],
        })),
        totalStudents: totalStudents,
        estimatedTimeMinutes: estimatedTime,
        totalDistanceKm: await this.calculateRouteDistance(origin, destination, optimizedStops),
      };
    } catch (error) {
      console.error(`[RouteSuggestion] Error generating balanced route:`, error);
      return null;
    }
  }

  /**
   * Tối ưu thứ tự điểm dừng bằng Google Maps Directions API
   */
  static async optimizeStopOrderWithGoogleDirections(stops, origin, destination) {
    if (!stops || stops.length === 0) return [];
    if (stops.length === 1) return stops;

    // Gọi Google Maps Directions API với optimize:true
    const waypoints = stops.map(s => `${s.lat},${s.lng}`);
    
    const directionsResult = await MapsService.getDirections({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      waypoints: waypoints,
      mode: 'driving',
      optimize: true,
      vehicleType: 'bus',
    });

    // Nếu có waypoint_order từ API, sắp xếp lại stops
    if (directionsResult.waypoint_order && Array.isArray(directionsResult.waypoint_order)) {
      const optimizedStops = directionsResult.waypoint_order.map(
        (index) => stops[index]
      );
      return optimizedStops;
    }

    // Fallback nếu không có waypoint_order
    throw new Error('No waypoint_order in Directions API response');
  }

  /**
   * Tối ưu thứ tự điểm dừng bằng TSP fallback (Nearest Neighbor)
   */
  static optimizeStopOrderFallbackTSP(stops, origin) {
    if (!stops || stops.length === 0) return [];
    if (stops.length === 1) return stops;

    console.log(`[RouteSuggestion] Using TSP fallback (Nearest Neighbor) for ${stops.length} stops`);

    const optimized = [];
    const remaining = [...stops];
    
    // Bắt đầu từ origin hoặc điểm xa nhất
    let currentPoint = origin;
    
    while (remaining.length > 0) {
      let nearestStop = null;
      let minDistance = Infinity;
      let nearestIndex = -1;

      // Tìm stop gần nhất với currentPoint
      for (let i = 0; i < remaining.length; i++) {
        const stop = remaining[i];
        if (!stop.lat || !stop.lng) continue;

        const distance = StopSuggestionService.calculateDistance(
          currentPoint.lat,
          currentPoint.lng,
          stop.lat,
          stop.lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestStop = stop;
          nearestIndex = i;
        }
      }

      // Nếu tìm được stop gần nhất, thêm vào và cập nhật currentPoint
      if (nearestStop && nearestIndex >= 0) {
        optimized.push(nearestStop);
        remaining.splice(nearestIndex, 1);
        currentPoint = {
          lat: nearestStop.lat,
          lng: nearestStop.lng,
        };
      } else {
        // Nếu không tìm được (có thể do thiếu tọa độ), thêm stop đầu tiên còn lại
        if (remaining.length > 0) {
          optimized.push(remaining.shift());
        }
      }
    }

    return optimized;
  }

  /**
   * Tối ưu thứ tự điểm dừng từ origin → destination
   * Sử dụng Google Directions API, fallback về TSP nếu fail
   */
  static async optimizeStopOrder(stops, origin, destination) {
    if (!stops || stops.length === 0) return [];
    if (stops.length === 1) return stops;

    try {
      // Thử dùng Google Directions API trước
      return await this.optimizeStopOrderWithGoogleDirections(stops, origin, destination);
    } catch (error) {
      // Log lỗi chi tiết
      console.warn(`[RouteSuggestion] Google Directions API failed, using TSP fallback:`, error.message);
      console.warn(`[RouteSuggestion] Error details:`, {
        stopsCount: stops.length,
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
      });
      
      // Fallback về TSP (Nearest Neighbor)
      return this.optimizeStopOrderFallbackTSP(stops, origin);
    }
  }

  /**
   * Ước tính thời gian tuyến đường (phút)
   */
  static async estimateRouteTime(origin, destination, stops) {
    try {
      if (stops.length === 0) {
        // Chỉ có origin → destination
        const distance = StopSuggestionService.calculateDistance(
          origin.lat, origin.lng, destination.lat, destination.lng
        );
        return Math.ceil(distance / 30 * 60); // Giả sử tốc độ trung bình 30 km/h
      }

      // Tính tổng khoảng cách
      let totalDistance = 0;
      
      // Origin → Stop đầu tiên
      totalDistance += StopSuggestionService.calculateDistance(
        origin.lat, origin.lng, stops[0].lat, stops[0].lng
      );

      // Giữa các stops
      for (let i = 0; i < stops.length - 1; i++) {
        totalDistance += StopSuggestionService.calculateDistance(
          stops[i].lat, stops[i].lng,
          stops[i + 1].lat, stops[i + 1].lng
        );
      }

      // Stop cuối → Destination
      totalDistance += StopSuggestionService.calculateDistance(
        stops[stops.length - 1].lat, stops[stops.length - 1].lng,
        destination.lat, destination.lng
      );

      // Thời gian di chuyển (tốc độ trung bình 30 km/h cho xe buýt trong thành phố)
      const travelTimeMinutes = Math.ceil((totalDistance / 30) * 60);

      // Thời gian dừng đón học sinh (ước tính 2 phút mỗi điểm dừng, tối đa 5 phút)
      const stopTimeMinutes = stops.reduce((sum, stop) => {
        const studentCount = stop.studentCount || 0;
        const estimatedStopTime = Math.min(Math.ceil(studentCount / 3), 5);
        return sum + estimatedStopTime;
      }, 0);

      return travelTimeMinutes + stopTimeMinutes;
    } catch (error) {
      console.warn(`[RouteSuggestion] Error estimating route time:`, error);
      // Fallback: ước tính đơn giản
      return Math.ceil((stops.length + 1) * 5); // 5 phút mỗi điểm
    }
  }

  /**
   * Tính tổng khoảng cách tuyến đường (km)
   */
  static async calculateRouteDistance(origin, destination, stops) {
    try {
      let totalDistance = 0;

      if (stops.length === 0) {
        return StopSuggestionService.calculateDistance(
          origin.lat, origin.lng, destination.lat, destination.lng
        );
      }

      // Origin → Stop đầu tiên
      totalDistance += StopSuggestionService.calculateDistance(
        origin.lat, origin.lng, stops[0].lat, stops[0].lng
      );

      // Giữa các stops
      for (let i = 0; i < stops.length - 1; i++) {
        totalDistance += StopSuggestionService.calculateDistance(
          stops[i].lat, stops[i].lng,
          stops[i + 1].lat, stops[i + 1].lng
        );
      }

      // Stop cuối → Destination
      totalDistance += StopSuggestionService.calculateDistance(
        stops[stops.length - 1].lat, stops[stops.length - 1].lng,
        destination.lat, destination.lng
      );

      return Math.round(totalDistance * 10) / 10; // Làm tròn 1 chữ số thập phân
    } catch (error) {
      console.warn(`[RouteSuggestion] Error calculating route distance:`, error);
      return 0;
    }
  }

  /**
   * Tạo routes trong database từ suggestions
   * @param {Object} suggestionResult - Kết quả từ suggestRoutes()
   * @param {Object} options - { createReturnRoutes: boolean }
   * @returns {Promise<Object>} { createdRoutes, returnRoutes, errors }
   */
  static async createRoutesFromSuggestions(suggestionResult, options = {}) {
    const { createReturnRoutes = true } = options;
    const createdRoutes = [];
    const createdReturnRoutes = [];
    const errors = [];

    // Import RouteService và DiemDungModel
    const RouteService = (await import("./RouteService.js")).default;
    const DiemDungModel = (await import("../models/DiemDungModel.js")).default;
    const MapsService = (await import("./MapsService.js")).default;

    // Tạo routes đi
    for (const route of suggestionResult.routes || []) {
      try {
        console.log(`[RouteSuggestion] Creating route: ${route.name}`);

        // Tạo hoặc tìm các stops trong DB
        const stopIds = [];
        for (const stop of route.stops || []) {
          if (!stop.lat || !stop.lng) {
            console.warn(`[RouteSuggestion] Stop missing coordinates, skipping`);
            continue;
          }

          // Tìm hoặc tạo stop
          const existingStops = await DiemDungModel.getByCoordinates(
            stop.lat, stop.lng, 0.0001 // ~11m tolerance
          );

          let stopId;
          if (existingStops.length > 0) {
            stopId = existingStops[0].maDiem;
          } else {
            // Tạo stop mới
            stopId = await DiemDungModel.create({
              tenDiem: stop.tenDiem || stop.address || `Điểm dừng ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`,
              viDo: stop.lat,
              kinhDo: stop.lng,
              address: stop.address || null,
            });
          }

          stopIds.push({ stop_id: stopId, sequence: stop.sequence || stopIds.length + 1 });
        }

        if (stopIds.length < 2) {
          console.warn(`[RouteSuggestion] Route ${route.name} has insufficient stops (${stopIds.length}), skipping`);
          errors.push({ route: route.name, error: "INSUFFICIENT_STOPS" });
          continue;
        }

        // Tạo route với stops
        const routeData = {
          tenTuyen: route.name,
          diemBatDau: route.origin.address || "Điểm xuất phát",
          diemKetThuc: route.destination.address || "Đại học Sài Gòn",
          thoiGianUocTinh: route.estimatedTimeMinutes || null,
          origin_lat: route.origin.lat,
          origin_lng: route.origin.lng,
          dest_lat: route.destination.lat,
          dest_lng: route.destination.lng,
          routeType: route.routeType || 'di',
          createReturnRoute: false, // Tạo riêng để kiểm soát tốt hơn
          stops: stopIds.map(s => ({
            stop_id: s.stop_id,
            sequence: s.sequence,
          })),
        };

        const createdRoute = await RouteService.create(routeData);

        // Rebuild polyline
        try {
          await RouteService.rebuildPolyline(createdRoute.maTuyen, MapsService);
        } catch (polylineError) {
          console.warn(`[RouteSuggestion] Failed to rebuild polyline:`, polylineError.message);
        }

        createdRoutes.push({
          maTuyen: createdRoute.maTuyen,
          tenTuyen: createdRoute.tenTuyen,
          totalStudents: route.totalStudents,
          stopCount: stopIds.length,
        });

        console.log(`[RouteSuggestion] ✅ Created route ${createdRoute.maTuyen}: ${route.name}`);

        // Tạo tuyến về nếu yêu cầu
        if (createReturnRoutes) {
          const returnRoute = suggestionResult.returnRoutes?.find(
            r => r.name === route.name.replace('(Đi)', '(Về)')
          );

          if (returnRoute) {
            try {
              const returnStopIds = [];
              for (const stop of returnRoute.stops || []) {
                if (!stop.lat || !stop.lng) continue;

                const existingStops = await DiemDungModel.getByCoordinates(
                  stop.lat, stop.lng, 0.0001
                );

                let stopId;
                if (existingStops.length > 0) {
                  stopId = existingStops[0].maDiem;
                } else {
                  stopId = await DiemDungModel.create({
                    tenDiem: stop.tenDiem || stop.address || `Điểm dừng ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`,
                    viDo: stop.lat,
                    kinhDo: stop.lng,
                    address: stop.address || null,
                  });
                }

                returnStopIds.push({ stop_id: stopId, sequence: stop.sequence || returnStopIds.length + 1 });
              }

              if (returnStopIds.length >= 2) {
                const returnRouteData = {
                  tenTuyen: returnRoute.name,
                  diemBatDau: returnRoute.origin.address || "Đại học Sài Gòn",
                  diemKetThuc: returnRoute.destination.address || "Điểm kết thúc",
                  thoiGianUocTinh: returnRoute.estimatedTimeMinutes || null,
                  origin_lat: returnRoute.origin.lat,
                  origin_lng: returnRoute.origin.lng,
                  dest_lat: returnRoute.destination.lat,
                  dest_lng: returnRoute.destination.lng,
                  routeType: 've',
                  pairedRouteId: createdRoute.maTuyen,
                  createReturnRoute: false,
                  stops: returnStopIds.map(s => ({
                    stop_id: s.stop_id,
                    sequence: s.sequence,
                  })),
                };

                const createdReturn = await RouteService.create(returnRouteData);

                // Update pairedRouteId cho route đi
                await TuyenDuongModel.update(createdRoute.maTuyen, {
                  pairedRouteId: createdReturn.maTuyen,
                });

                // Rebuild polyline
                try {
                  await RouteService.rebuildPolyline(createdReturn.maTuyen, MapsService);
                } catch (polylineError) {
                  console.warn(`[RouteSuggestion] Failed to rebuild return route polyline:`, polylineError.message);
                }

                createdReturnRoutes.push({
                  maTuyen: createdReturn.maTuyen,
                  tenTuyen: createdReturn.tenTuyen,
                  pairedRouteId: createdRoute.maTuyen,
                });

                console.log(`[RouteSuggestion] ✅ Created return route ${createdReturn.maTuyen}`);
              }
            } catch (returnError) {
              console.error(`[RouteSuggestion] Failed to create return route:`, returnError);
              errors.push({ route: returnRoute.name, error: returnError.message });
            }
          }
        }

      } catch (error) {
        console.error(`[RouteSuggestion] Failed to create route ${route.name}:`, error);
        errors.push({ route: route.name, error: error.message });
      }
    }

    return {
      createdRoutes,
      createdReturnRoutes,
      totalCreated: createdRoutes.length + createdReturnRoutes.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export default RouteSuggestionService;

