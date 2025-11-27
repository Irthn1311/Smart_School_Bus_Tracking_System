import pool from "../config/db.js";
import HocSinhModel from "../models/HocSinhModel.js";
import MapsService from "./MapsService.js";

/**
 * Service để đề xuất điểm dừng dựa trên clustering địa chỉ học sinh
 */
class StopSuggestionService {
  /**
   * Tính khoảng cách giữa 2 điểm (Haversine formula)
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * Parse địa chỉ để extract tọa độ hoặc keywords
   */
  static parseAddress(address) {
    if (!address) return null;

    // Nếu địa chỉ có format "lat, lng" hoặc tọa độ
    const coordMatch = address.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
        keywords: [],
      };
    }

    // Extract keywords từ địa chỉ (tên đường, phường, quận)
    const keywords = address
      .split(/[,\s]+/)
      .filter((word) => word.length > 2)
      .map((word) => word.toLowerCase());

    return {
      lat: null,
      lng: null,
      keywords,
    };
  }

  /**
   * Clustering học sinh theo địa chỉ gần nhau
   * Sử dụng thuật toán đơn giản với centroid và merge cluster nhỏ
   */
  static clusterStudents(students, maxDistanceKm = 0.8) {
    if (!students || students.length === 0) {
      console.log("[StopSuggestion] No students to cluster");
      return [];
    }

    // Lọc học sinh có tọa độ
    const studentsWithCoords = students.filter(
      (s) => s.viDo && s.kinhDo && !isNaN(s.viDo) && !isNaN(s.kinhDo) && !s.missingCoords
    );

    console.log(`[StopSuggestion] ${studentsWithCoords.length}/${students.length} students have coordinates`);

    if (studentsWithCoords.length === 0) {
      // Fallback: clustering theo keywords địa chỉ
      console.log("[StopSuggestion] No coordinates, using keyword-based clustering");
      return this.clusterByAddressKeywords(students);
    }

    // Clustering với centroid
    const clusters = [];

    studentsWithCoords.forEach((student) => {
      // Tìm cluster có centroid gần nhất
      let nearestCluster = null;
      let minDistance = Infinity;

      for (const cluster of clusters) {
        const centroid = this.calculateClusterCenter(cluster);
        if (!centroid.lat || !centroid.lng) continue;

        const distance = this.calculateDistance(
          student.viDo,
          student.kinhDo,
          centroid.lat,
          centroid.lng
        );

        if (distance <= maxDistanceKm && distance < minDistance) {
          minDistance = distance;
          nearestCluster = cluster;
        }
      }

      // Nếu tìm được cluster gần, thêm vào cluster đó
      if (nearestCluster) {
        nearestCluster.push(student);
      } else {
        // Tạo cluster mới
        clusters.push([student]);
      }
    });

    // Merge cluster quá nhỏ (< 300m)
    const mergedClusters = this.mergeSmallClusters(clusters, 0.3); // 300m = 0.3km

    // Nếu còn học sinh không có tọa độ, thêm vào clusters riêng
    const studentsWithoutCoords = students.filter(
      (s) => s.missingCoords === true || !s.viDo || !s.kinhDo || isNaN(s.viDo) || isNaN(s.kinhDo)
    );

    if (studentsWithoutCoords.length > 0) {
      console.log(`[StopSuggestion] ${studentsWithoutCoords.length} students without coordinates, clustering by keywords`);
      const keywordClusters = this.clusterByAddressKeywords(studentsWithoutCoords);
      mergedClusters.push(...keywordClusters);
    }

    return mergedClusters;
  }

  /**
   * Merge các cluster nhỏ (chỉ có 1 học sinh) với cluster gần nhất nếu khoảng cách < threshold
   */
  static mergeSmallClusters(clusters, mergeThresholdKm = 0.3) {
    const merged = [];
    const processed = new Set();

    // Tìm các cluster nhỏ (1 học sinh)
    const smallClusters = clusters.filter((c, idx) => {
      if (c.length === 1) {
        processed.add(idx);
        return true;
      }
      return false;
    });

    // Các cluster lớn hơn
    const largeClusters = clusters.filter((c, idx) => !processed.has(idx));

    // Với mỗi cluster nhỏ, tìm cluster lớn gần nhất
    for (const smallCluster of smallClusters) {
      const student = smallCluster[0];
      let nearestLargeCluster = null;
      let minDistance = Infinity;

      for (const largeCluster of largeClusters) {
        const centroid = this.calculateClusterCenter(largeCluster);
        if (!centroid.lat || !centroid.lng) continue;

        const distance = this.calculateDistance(
          student.viDo,
          student.kinhDo,
          centroid.lat,
          centroid.lng
        );

        if (distance < mergeThresholdKm && distance < minDistance) {
          minDistance = distance;
          nearestLargeCluster = largeCluster;
        }
      }

      // Nếu tìm được cluster gần, merge vào
      if (nearestLargeCluster) {
        nearestLargeCluster.push(student);
      } else {
        // Giữ nguyên cluster nhỏ
        merged.push(smallCluster);
      }
    }

    // Thêm các cluster lớn vào kết quả
    merged.push(...largeClusters);

    return merged;
  }

  /**
   * Clustering theo keywords địa chỉ (fallback khi không có tọa độ)
   */
  static clusterByAddressKeywords(students) {
    const clusters = [];
    const visited = new Set();

    students.forEach((student, idx) => {
      if (visited.has(idx)) return;

      // Nếu không có địa chỉ, tạo cluster riêng cho học sinh này
      if (!student.diaChi || !student.diaChi.trim()) {
        clusters.push([student]);
        visited.add(idx);
        return;
      }

      const parsed = this.parseAddress(student.diaChi);
      if (!parsed || parsed.keywords.length === 0) {
        // Nếu không parse được, tạo cluster riêng
        clusters.push([student]);
        visited.add(idx);
        return;
      }

      const cluster = [student];
      visited.add(idx);

      // Tìm học sinh có địa chỉ tương tự
      students.forEach((otherStudent, otherIdx) => {
        if (visited.has(otherIdx) || idx === otherIdx) return;

        if (!otherStudent.diaChi || !otherStudent.diaChi.trim()) {
          return; // Skip học sinh không có địa chỉ
        }

        const otherParsed = this.parseAddress(otherStudent.diaChi);
        if (!otherParsed || otherParsed.keywords.length === 0) {
          return;
        }

        // Tính điểm matching keywords
        const commonKeywords = parsed.keywords.filter((kw) =>
          otherParsed.keywords.includes(kw)
        );
        const matchScore = commonKeywords.length / Math.max(parsed.keywords.length, otherParsed.keywords.length);

        if (matchScore >= 0.2) {
          // Giảm threshold xuống 20% để dễ match hơn
          cluster.push(otherStudent);
          visited.add(otherIdx);
        }
      });

      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    });

    return clusters;
  }

  /**
   * Tính điểm trung tâm của cluster
   */
  static calculateClusterCenter(cluster) {
    if (cluster.length === 0) return null;

    // Nếu có tọa độ, tính trung bình
    const studentsWithCoords = cluster.filter(
      (s) => s.viDo && s.kinhDo && !isNaN(s.viDo) && !isNaN(s.kinhDo)
    );

    if (studentsWithCoords.length > 0) {
      const avgLat =
        studentsWithCoords.reduce((sum, s) => sum + s.viDo, 0) /
        studentsWithCoords.length;
      const avgLng =
        studentsWithCoords.reduce((sum, s) => sum + s.kinhDo, 0) /
        studentsWithCoords.length;

      return {
        lat: avgLat,
        lng: avgLng,
        studentCount: cluster.length,
        students: cluster.map((s) => ({
          maHocSinh: s.maHocSinh,
          hoTen: s.hoTen,
          diaChi: s.diaChi,
        })),
      };
    }

    // Fallback: lấy địa chỉ đầu tiên
    const firstStudent = cluster[0];
    return {
      lat: null,
      lng: null,
      address: firstStudent.diaChi,
      studentCount: cluster.length,
      students: cluster.map((s) => ({
        maHocSinh: s.maHocSinh,
        hoTen: s.hoTen,
        diaChi: s.diaChi,
      })),
    };
  }

  /**
   * Geocode địa chỉ học sinh để lấy tọa độ (nếu chưa có)
   * Có retry mechanism (2-3 lần) và đánh dấu học sinh không có tọa độ
   */
  static async enrichStudentCoordinates(students, retryCount = 2) {
    const enriched = [];
    const geocodeCache = new Map(); // Cache để tránh geocode nhiều lần cùng địa chỉ

    for (const student of students) {
      // Nếu đã có tọa độ, giữ nguyên
      if (student.viDo && student.kinhDo && !isNaN(student.viDo) && !isNaN(student.kinhDo)) {
        enriched.push({
          ...student,
          viDo: parseFloat(student.viDo),
          kinhDo: parseFloat(student.kinhDo),
          missingCoords: false,
        });
        continue;
      }

      // Nếu không có tọa độ và có địa chỉ, thử geocode với retry
      if (student.diaChi && student.diaChi.trim()) {
        const address = student.diaChi.trim();
        
        // Check cache
        if (geocodeCache.has(address)) {
          const cached = geocodeCache.get(address);
          enriched.push({
            ...student,
            viDo: cached.lat,
            kinhDo: cached.lng,
            missingCoords: false,
          });
          continue;
        }

        // Geocode địa chỉ với retry
        let geocodeSuccess = false;
        let lastError = null;
        
        for (let attempt = 0; attempt <= retryCount; attempt++) {
          try {
            // Thêm delay nhỏ giữa các lần retry (trừ lần đầu)
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // 500ms, 1000ms
            }
            
            const geocodeResult = await MapsService.geocode({ address });
            if (geocodeResult.results && geocodeResult.results.length > 0) {
              const location = geocodeResult.results[0].geometry.location;
              geocodeCache.set(address, { lat: location.lat, lng: location.lng });
              enriched.push({
                ...student,
                viDo: location.lat,
                kinhDo: location.lng,
                missingCoords: false,
              });
              geocodeSuccess = true;
              break;
            }
          } catch (geocodeError) {
            lastError = geocodeError;
            console.warn(
              `[StopSuggestion] Geocode attempt ${attempt + 1}/${retryCount + 1} failed for student ${student.maHocSinh}:`,
              geocodeError.message
            );
          }
        }

        // Nếu tất cả attempts đều fail, đánh dấu missingCoords
        if (!geocodeSuccess) {
          console.warn(
            `[StopSuggestion] Failed to geocode address for student ${student.maHocSinh} after ${retryCount + 1} attempts:`,
            lastError?.message || 'Unknown error'
          );
          enriched.push({
            ...student,
            missingCoords: true,
          });
        }
      } else {
        // Không có địa chỉ, đánh dấu missingCoords
        enriched.push({
          ...student,
          missingCoords: true,
        });
      }
    }

    return enriched;
  }

  /**
   * Sắp xếp suggestions theo thứ tự tối ưu từ origin → destination
   * Sử dụng Google Maps Directions API để tối ưu lộ trình
   */
  static async optimizeRouteOrder(suggestions, origin, destination) {
    if (!origin || !destination || suggestions.length === 0) {
      return suggestions;
    }

    try {
      // Parse origin và destination
      const originCoords = typeof origin === 'string' 
        ? origin.split(',').map(Number)
        : [origin.lat, origin.lng];
      const destCoords = typeof destination === 'string'
        ? destination.split(',').map(Number)
        : [destination.lat, destination.lng];

      // Lọc suggestions có tọa độ hợp lệ
      const validSuggestions = suggestions.filter(s => s.lat && s.lng);
      if (validSuggestions.length === 0) {
        return suggestions;
      }

      // Nếu chỉ có 1 suggestion, không cần optimize
      if (validSuggestions.length === 1) {
        return suggestions;
      }

      // Tạo waypoints từ suggestions
      const waypoints = validSuggestions.map(s => ({
        location: `${s.lat},${s.lng}`,
      }));

      console.log(`[StopSuggestion] Optimizing route order with ${waypoints.length} waypoints`);

      // Gọi Google Maps Directions API với optimize:true để tự động sắp xếp waypoints
      // Sử dụng vehicleType="bus" để tối ưu cho xe buýt
      const directionsResult = await MapsService.getDirections({
        origin: `${originCoords[0]},${originCoords[1]}`,
        destination: `${destCoords[0]},${destCoords[1]}`,
        waypoints: waypoints.map(w => w.location), // Chỉ cần location string
        mode: 'driving', // Mode driving phù hợp với xe buýt (xe lớn)
        optimize: true, // Tối ưu thứ tự waypoints
        vehicleType: 'bus', // Chỉ định loại xe là buýt
      });

      // Nếu có route optimized, sắp xếp lại suggestions theo thứ tự từ Directions API
      if (directionsResult && directionsResult.legs && directionsResult.legs.length > 0) {
        // Directions API đã tự động sắp xếp waypoints theo thứ tự tối ưu
        // Ta cần map lại theo thứ tự trong response
        const optimizedOrder = [];
        
        // Lấy thứ tự từ waypoint_order (nếu có) - đây là cách chính xác nhất
        if (directionsResult.waypoint_order && Array.isArray(directionsResult.waypoint_order)) {
          console.log(`[StopSuggestion] Using waypoint_order:`, directionsResult.waypoint_order);
          // waypoint_order chứa indices của waypoints đã được sắp xếp
          directionsResult.waypoint_order.forEach((originalIndex) => {
            if (validSuggestions[originalIndex]) {
              optimizedOrder.push(validSuggestions[originalIndex]);
            }
          });
        } else {
          // Fallback: sắp xếp theo thứ tự legs
          // Legs[0] là từ origin đến waypoint đầu tiên
          // Legs[1..n-1] là giữa các waypoints
          // Legs[n] là từ waypoint cuối đến destination
          // Ta cần extract waypoints từ legs
          const waypointCoords = [];
          directionsResult.legs.forEach((leg, idx) => {
            if (idx < directionsResult.legs.length - 1 && leg.end_location) {
              waypointCoords.push({
                lat: leg.end_location.lat,
                lng: leg.end_location.lng,
              });
            }
          });

          console.log(`[StopSuggestion] Using legs order, found ${waypointCoords.length} waypoints`);

          // Match waypointCoords với validSuggestions
          waypointCoords.forEach((coord) => {
            const tolerance = 0.001; // ~100m
            const matched = validSuggestions.find((s) => {
              const latDiff = Math.abs(s.lat - coord.lat);
              const lngDiff = Math.abs(s.lng - coord.lng);
              return latDiff < tolerance && lngDiff < tolerance;
            });
            if (matched && !optimizedOrder.find(o => o.id === matched.id)) {
              optimizedOrder.push(matched);
            }
          });
        }

        // Thêm các suggestions không có trong optimized order (không có tọa độ hoặc không match)
        const optimizedIds = new Set(optimizedOrder.map(s => s.id));
        const remaining = suggestions.filter(s => !optimizedIds.has(s.id));

        // Kết hợp: optimized order + remaining
        const result = [...optimizedOrder, ...remaining];
        
        // Cập nhật suggestedSequence
        result.forEach((suggestion, idx) => {
          suggestion.suggestedSequence = idx + 1;
        });

        console.log(`[StopSuggestion] Optimized route order: ${result.length} stops`);
        return result;
      }
    } catch (error) {
      console.warn(`[StopSuggestion] Failed to optimize route order:`, error.message);
      // Fallback: sắp xếp theo khoảng cách từ origin
      return this.sortByDistanceFromOrigin(suggestions, origin);
    }

    return suggestions;
  }

  /**
   * Sắp xếp suggestions theo khoảng cách từ origin (fallback)
   */
  static sortByDistanceFromOrigin(suggestions, origin) {
    if (!origin || suggestions.length === 0) {
      return suggestions;
    }

    const originCoords = typeof origin === 'string'
      ? origin.split(',').map(Number)
      : [origin.lat, origin.lng];

    const sorted = [...suggestions].sort((a, b) => {
      if (!a.lat || !a.lng) return 1;
      if (!b.lat || !b.lng) return -1;

      const distA = this.calculateDistance(originCoords[0], originCoords[1], a.lat, a.lng);
      const distB = this.calculateDistance(originCoords[0], originCoords[1], b.lat, b.lng);
      return distA - distB;
    });

    // Cập nhật suggestedSequence
    sorted.forEach((suggestion, idx) => {
      suggestion.suggestedSequence = idx + 1;
    });

    return sorted;
  }

  /**
   * Đề xuất điểm dừng dựa trên học sinh trong khu vực
   */
  static async suggestStops(options = {}) {
    const {
      area = null, // Filter theo khu vực (quận/huyện)
      maxDistanceKm = 2.0, // Khoảng cách tối đa để clustering (km)
      minStudentsPerStop = 3, // Số học sinh tối thiểu mỗi điểm dừng
      maxStops = 20, // Số điểm dừng tối đa
      geocodeAddresses = true, // Có geocode địa chỉ không có tọa độ không
      origin = null, // Điểm bắt đầu (lat,lng hoặc {lat, lng})
      destination = null, // Điểm kết thúc (lat,lng hoặc {lat, lng})
      optimizeRoute = true, // Có tối ưu lộ trình không
    } = options;

    try {
      // Lấy tất cả học sinh
      let students = await HocSinhModel.getAll();

      // Filter theo khu vực nếu có
      if (area) {
        students = students.filter((s) =>
          s.diaChi && s.diaChi.toLowerCase().includes(area.toLowerCase())
        );
      }

      if (students.length === 0) {
        return {
          suggestions: [],
          message: "Không tìm thấy học sinh trong khu vực này",
        };
      }

      console.log(`[StopSuggestion] Found ${students.length} students${area ? ` in area: ${area}` : ''}`);

      // Enrich coordinates nếu cần (nhưng không bắt buộc)
      if (geocodeAddresses) {
        console.log(`[StopSuggestion] Enriching coordinates for ${students.length} students...`);
        students = await this.enrichStudentCoordinates(students);
        const studentsWithCoords = students.filter(s => s.viDo && s.kinhDo);
        console.log(`[StopSuggestion] ${studentsWithCoords.length}/${students.length} students have coordinates`);
      }

      // Clustering học sinh
      const clusters = this.clusterStudents(students, maxDistanceKm);
      console.log(`[StopSuggestion] Created ${clusters.length} clusters`);

      // Lọc clusters có đủ học sinh (giảm minStudentsPerStop xuống 1 nếu không có cluster nào đủ)
      let validClusters = clusters.filter(
        (c) => c.length >= minStudentsPerStop
      );
      
      // Nếu không có cluster nào đủ minStudentsPerStop, giảm xuống 1
      if (validClusters.length === 0 && minStudentsPerStop > 1) {
        console.log(`[StopSuggestion] No clusters with ${minStudentsPerStop} students, reducing to min 1`);
        validClusters = clusters.filter((c) => c.length >= 1);
      }
      
      console.log(`[StopSuggestion] ${validClusters.length} valid clusters (min ${validClusters.length > 0 ? Math.min(...validClusters.map(c => c.length)) : 0} students per cluster)`);

      // Tính điểm trung tâm cho mỗi cluster
      const suggestions = validClusters
        .slice(0, maxStops)
        .map((cluster, index) => {
          const center = this.calculateClusterCenter(cluster);
          return {
            id: `suggestion_${index + 1}`,
            name: `Điểm dừng ${index + 1}`,
            address: center.address || this.generateStopName(cluster),
            lat: center.lat,
            lng: center.lng,
            studentCount: center.studentCount,
            students: center.students,
            suggestedSequence: index + 1,
          };
        });

      // Sắp xếp theo số lượng học sinh (giảm dần) trước khi optimize
      suggestions.sort((a, b) => b.studentCount - a.studentCount);

      // Tối ưu thứ tự lộ trình nếu có origin và destination
      let optimizedSuggestions = suggestions;
      if (optimizeRoute && origin && destination && suggestions.length > 1) {
        try {
          console.log(`[StopSuggestion] Optimizing route order with origin and destination`);
          optimizedSuggestions = await this.optimizeRouteOrder(suggestions, origin, destination);
        } catch (optimizeError) {
          console.warn(`[StopSuggestion] Route optimization failed, using original order:`, optimizeError.message);
          // Fallback: sắp xếp theo khoảng cách từ origin
          optimizedSuggestions = this.sortByDistanceFromOrigin(suggestions, origin);
        }
      } else if (origin && suggestions.length > 1) {
        // Nếu chỉ có origin, sắp xếp theo khoảng cách từ origin
        optimizedSuggestions = this.sortByDistanceFromOrigin(suggestions, origin);
      }

      return {
        suggestions: optimizedSuggestions,
        totalStudents: students.length,
        totalClusters: clusters.length,
        validClusters: validClusters.length,
        optimized: optimizeRoute && origin && destination,
      };
    } catch (error) {
      console.error("Error in StopSuggestionService.suggestStops:", error);
      throw error;
    }
  }

  /**
   * Tạo tên điểm dừng từ cluster học sinh
   * Ưu tiên lấy tên từ địa chỉ của 1-2 học sinh đầu tiên + số lượng học sinh
   */
  static generateStopName(cluster) {
    if (cluster.length === 0) return "Điểm dừng";

    // Lấy địa chỉ của 1-2 học sinh đầu tiên
    const firstStudent = cluster[0];
    const secondStudent = cluster.length > 1 ? cluster[1] : null;

    if (firstStudent && firstStudent.diaChi) {
      // Extract tên đường/phường từ địa chỉ
      const addressParts = firstStudent.diaChi.split(',').map(s => s.trim());
      
      // Tìm tên đường (thường là phần đầu tiên)
      let streetName = addressParts[0];
      
      // Nếu có phường/quận, thêm vào
      const ward = addressParts.find(p => p.toLowerCase().includes('phường') || p.toLowerCase().includes('ward'));
      const district = addressParts.find(p => p.toLowerCase().includes('quận') || p.toLowerCase().includes('district'));
      
      // Tạo tên điểm dừng
      let stopName = streetName;
      if (ward) {
        stopName = `${streetName}, ${ward}`;
      }
      
      // Thêm số lượng học sinh
      if (cluster.length > 1) {
        stopName = `${stopName} (Nhóm ${cluster.length} HS)`;
      }
      
      return stopName;
    }

    // Fallback: dùng từ khóa phổ biến
    const addressKeywords = {};
    cluster.forEach((student) => {
      const parsed = this.parseAddress(student.diaChi);
      if (parsed && parsed.keywords) {
        parsed.keywords.forEach((kw) => {
          addressKeywords[kw] = (addressKeywords[kw] || 0) + 1;
        });
      }
    });

    const topKeywords = Object.entries(addressKeywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([kw]) => kw);

    if (topKeywords.length > 0) {
      return `Trạm ${topKeywords.join(" ")} (${cluster.length} HS)`;
    }

    return `Điểm dừng (${cluster.length} học sinh)`;
  }
}

export default StopSuggestionService;

